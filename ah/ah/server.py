import io
import json
import uuid
from typing import Any, Dict, List, Optional

import numpy as np
import pandas as pd
import pdfplumber
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sklearn.cluster import KMeans
from sklearn.ensemble import GradientBoostingClassifier

app = FastAPI(title="KPMG Smart Campus Analytics API")

# Fixes Cross-Origin blocks so your React app on 5173 can talk to port 8000
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Dataset generation helpers
# ---------------------------------------------------------------------------

DEPARTMENTS = ["CSE", "ECE", "MBA", "Mechanical", "Civil"]
FEATURES = [
    "cgpa", "backlogs", "attendance", "lms_logins",
    "assignments_late", "placement_mock_score", "technical_skill_score",
]


def calc_success_score(row: Dict[str, Any]) -> float:
    acad = (row["cgpa"] / 10.0) * 100
    lms = max(0, 100 - (row["assignments_late"] * 15))
    return round(
        (acad * 0.3)
        + (row["attendance"] * 0.2)
        + (lms * 0.15)
        + (row["placement_mock_score"] * 0.2)
        + (row["technical_skill_score"] * 0.15),
        2,
    )


def generate_student_df(n: int = 100, seed: int = 42) -> pd.DataFrame:
    rng = np.random.default_rng(seed)

    cgpa = rng.uniform(6.0, 10.0, n)
    backlogs = rng.integers(0, 4, n)
    attendance = rng.uniform(60, 100, n)
    lms_logins = rng.integers(15, 250, n)
    assignments_late = rng.integers(0, 6, n)
    placement_mock_score = rng.uniform(40, 100, n)
    technical_skill_score = rng.uniform(45, 100, n)
    student_satisfaction = rng.integers(1, 6, n)
    departments = rng.choice(DEPARTMENTS, n)

    at_risk_academic, at_risk_placement = [], []
    for i in range(n):
        p_acad = 0.1
        if attendance[i] < 75:
            p_acad += 0.4
        if backlogs[i] > 1:
            p_acad += 0.3
        at_risk_academic.append(1 if rng.random() < min(p_acad, 0.95) else 0)

        p_place = 0.1
        if placement_mock_score[i] < 60:
            p_place += 0.4
        if technical_skill_score[i] < 60:
            p_place += 0.3
        at_risk_placement.append(1 if rng.random() < min(p_place, 0.95) else 0)

    df = pd.DataFrame(
        {
            "student_id": [f"STU{1000 + i}" for i in range(n)],
            "name": [f"Student {i + 1}" for i in range(n)],
            "department": departments,
            "cgpa": cgpa,
            "backlogs": backlogs,
            "attendance": attendance,
            "lms_logins": lms_logins,
            "assignments_late": assignments_late,
            "placement_mock_score": placement_mock_score,
            "technical_skill_score": technical_skill_score,
            "student_satisfaction": student_satisfaction,
            "at_risk_academic": at_risk_academic,
            "at_risk_placement": at_risk_placement,
        }
    )

    df["student_success_score"] = df.apply(
        lambda r: calc_success_score(r.to_dict()), axis=1
    )

    X = df[FEATURES]
    clf_a = GradientBoostingClassifier(random_state=42).fit(X, df["at_risk_academic"])
    clf_p = GradientBoostingClassifier(random_state=42).fit(X, df["at_risk_placement"])
    km = KMeans(n_clusters=4, n_init=10, random_state=42).fit(X)

    df["academic_risk_flag"] = clf_a.predict(X)
    df["placement_risk_flag"] = clf_p.predict(X)
    df["segmentation_cluster"] = km.labels_

    return df


# Build the default in-memory dataset once at startup
_df = generate_student_df()

# In-memory interventions store
_interventions: List[Dict[str, Any]] = []

# ---------------------------------------------------------------------------
# Pydantic models
# ---------------------------------------------------------------------------


class NaturalEntryRequest(BaseModel):
    text: str


class LLMInsightsRequest(BaseModel):
    prompt: Optional[str] = None


class InterventionCreate(BaseModel):
    title: str
    description: Optional[str] = None
    target_students: Optional[List[str]] = None
    status: Optional[str] = "planned"
    created_at: Optional[str] = None


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------


@app.get("/health")
def health_check():
    return {"status": "ok"}


@app.get("/api/students")
def get_all_students():
    return _df.to_dict(orient="records")


def extract_pdf_student_records(content: bytes) -> List[Dict[str, Any]]:
    recognized_headers = {
        "id", "studentid", "studentnumber", "rollnumber", "rollno", "roll",
        "name", "studentname", "fullname", "department", "dept", "cgpa", "gpa",
        "backlogs", "backlog", "attendance", "attendancepercentage",
        "lmslogins", "logins", "loginfrequency", "assignmentslate",
        "lateassignments", "codingscore", "aptitudescore", "mockinterviewscore",
    }
    records: List[Dict[str, Any]] = []

    try:
        with pdfplumber.open(io.BytesIO(content)) as pdf:
            for page in pdf.pages:
                for table in page.extract_tables():
                    if not table:
                        continue
                    header_index = next(
                        (
                            index
                            for index, row in enumerate(table)
                            if sum(
                                "".join(ch for ch in str(cell or "").lower() if ch.isalnum())
                                in recognized_headers
                                for cell in row
                            ) >= 2
                        ),
                        None,
                    )
                    if header_index is None:
                        continue
                    headers = [
                        str(cell).strip() if cell is not None else ""
                        for cell in table[header_index]
                    ]
                    for row in table[header_index + 1:]:
                        values = [
                            str(cell).strip() if cell is not None else ""
                            for cell in row
                        ]
                        if not any(values):
                            continue
                        if sum(
                            "".join(ch for ch in value.lower() if ch.isalnum())
                            in recognized_headers
                            for value in values
                        ) >= 2:
                            continue
                        record = {
                            header: value
                            for header, value in zip(headers, values)
                            if header and value
                        }
                        if record:
                            records.append(record)
    except Exception as exc:
        raise ValueError(f"Could not read PDF: {exc}") from exc

    if not records:
        raise ValueError(
            "No readable student table was found in the PDF. Use a text-based PDF with column headers."
        )
    return records


# POST /api/analytics/benchmark  — reload / return the benchmark dataset
@app.post("/api/analytics/benchmark")
def reload_benchmark():
    global _df
    _df = generate_student_df()
    return {"students": _df.to_dict(orient="records")}


# POST /api/analytics/upload  — accept a CSV or JSON file
@app.post("/api/analytics/upload")
async def upload_file(file: UploadFile = File(...)):
    content = await file.read()
    filename = file.filename or ""
    extension = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""

    try:
        if extension == "csv":
            uploaded_df = pd.read_csv(io.BytesIO(content))
        elif extension == "json":
            uploaded_df = pd.read_json(io.BytesIO(content))
        elif extension == "pdf":
            uploaded_df = pd.DataFrame(extract_pdf_student_records(content))
        else:
            raise HTTPException(status_code=400, detail="Only .csv, .json, or .pdf files are supported.")
    except Exception as exc:
        raise HTTPException(status_code=422, detail=f"Could not parse file: {exc}") from exc

    # Ensure required columns exist (fill missing with defaults)
    for col in FEATURES:
        if col not in uploaded_df.columns:
            uploaded_df[col] = 0.0

    if "student_id" not in uploaded_df.columns:
        uploaded_df["student_id"] = [f"STU{i}" for i in range(len(uploaded_df))]
    if "name" not in uploaded_df.columns:
        uploaded_df["name"] = [f"Student {i + 1}" for i in range(len(uploaded_df))]
    if "department" not in uploaded_df.columns:
        uploaded_df["department"] = "Unknown"

    uploaded_df["student_success_score"] = uploaded_df.apply(
        lambda r: calc_success_score(r.to_dict()), axis=1
    )

    global _df
    _df = uploaded_df

    return {
        "data": _df.to_dict(orient="records"),
        "llm_insight": f"Successfully loaded {len(_df)} student records from '{filename}'.",
    }


# POST /api/analytics/natural-entry  — simple text-based data entry
@app.post("/api/analytics/natural-entry")
def natural_entry(req: NaturalEntryRequest):
    """
    Very lightweight NLP: parse lines like
      'Student 5 cgpa 8.2 attendance 90'
    and update the in-memory DataFrame accordingly.
    """
    global _df
    text = req.text.strip()
    if not text:
        raise HTTPException(status_code=400, detail="No text provided.")

    updated = 0
    for line in text.splitlines():
        parts = line.lower().split()
        # look for a student id or name token
        sid = None
        for i, p in enumerate(parts):
            if p.startswith("stu"):
                sid = p.upper()
                break
            if p == "student" and i + 1 < len(parts):
                try:
                    idx = int(parts[i + 1]) - 1
                    if 0 <= idx < len(_df):
                        sid = _df.iloc[idx]["student_id"]
                except ValueError:
                    pass
        if sid is None:
            continue

        mask = _df["student_id"] == sid
        if not mask.any():
            continue

        # Parse field-value pairs
        i = 0
        while i < len(parts) - 1:
            field = parts[i]
            if field in FEATURES:
                try:
                    _df.loc[mask, field] = float(parts[i + 1])
                    updated += 1
                    i += 2
                    continue
                except ValueError:
                    pass
            i += 1

    # Recompute derived columns
    _df["student_success_score"] = _df.apply(
        lambda r: calc_success_score(r.to_dict()), axis=1
    )

    return {
        "message": f"Applied updates to {updated} field(s).",
        "all_students": _df.to_dict(orient="records"),
    }


# POST /api/analytics/llm-insights
@app.post("/api/analytics/llm-insights")
def llm_insights(req: LLMInsightsRequest):
    """Return a rule-based summary insight (no external LLM required)."""
    total = len(_df)
    at_risk_acad = int(_df["academic_risk_flag"].sum())
    at_risk_place = int(_df["placement_risk_flag"].sum())
    avg_cgpa = round(float(_df["cgpa"].mean()), 2)
    avg_attend = round(float(_df["attendance"].mean()), 2)

    insight = (
        f"Analysed {total} students. "
        f"{at_risk_acad} ({round(at_risk_acad/total*100)}%) are at academic risk and "
        f"{at_risk_place} ({round(at_risk_place/total*100)}%) face placement risk. "
        f"Average CGPA: {avg_cgpa}, Average Attendance: {avg_attend}%. "
        "Recommend targeted interventions for students with attendance below 75% "
        "and CGPA below 6.5."
    )
    return {"insight": insight}


# GET /api/interventions
@app.get("/api/interventions")
def get_interventions():
    return _interventions


# POST /api/interventions
@app.post("/api/interventions")
def create_intervention(data: InterventionCreate):
    record = {"id": str(uuid.uuid4()), **data.model_dump()}
    _interventions.append(record)
    return record

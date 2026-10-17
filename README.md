# COGNITIVE - Student Success Analytics

A smart campus analytics dashboard that helps colleges spot at-risk students early using attendance, CGPA, LMS engagement, late assignments, coding scores and placement data.

## Features
- Overview dashboard with success score and risk categories
- Risk analysis with clear reasons (for example, attendance below 75%)
- Student segments, interventions and LMS engagement pages
- CSV import with a downloadable template

## Tech stack
- Frontend: React, TypeScript, Vite
- Backend: Python, FastAPI (uvicorn)

## Run locally
Backend:
    cd ah/backend
    uvicorn server:app --reload

Frontend (in a second terminal):
    cd ah/ah/project-bolt-sb1-soc1dq28/project
    npm install
    npm run dev

Then open http://localhost:5173

## Note
All sample data in this project is synthetic. Do not commit real student data or a .env file.

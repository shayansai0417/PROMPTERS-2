import { useEffect, useRef, useState } from 'react';
import {
  Bell,
  CalendarDays,
  ChevronDown,
  CheckCheck,
  CircleHelp,
  Database,
  Keyboard,
  LogOut,
  Mail,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  Trash2,
  TriangleAlert,
  Upload,
  RefreshCw,
  X,
  ArrowRight,
} from 'lucide-react';
import type { UserAccount } from '@/lib/auth';

type Panel = 'profile' | 'settings' | 'help' | 'notifications' | null;

interface NotificationItem {
  id: string;
  title: string;
  description: string;
  time: string;
  category: string;
  kind: 'warning' | 'calendar' | 'success';
  highPriority?: boolean;
  unread?: boolean;
}

type NotificationTab = 'all' | 'unread' | 'priority';

interface HeaderProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  hasData: boolean;
  onLoadBenchmark: () => void;
  onResetData: () => void;
  onOpenUpload: () => void;
  onLogout: () => void;
  userRole?: 'Admin' | 'Teacher' | 'Student';
  currentUser?: UserAccount | null;
}

export default function Header({
  searchQuery,
  onSearchChange,
  hasData,
  onLoadBenchmark,
  onResetData,
  onOpenUpload,
  onLogout,
  userRole = 'Admin',
  currentUser,
}: HeaderProps) {
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [activePanel, setActivePanel] = useState<Panel>(null);
  const [readNotificationIds, setReadNotificationIds] = useState<Set<string>>(new Set());
  const [notificationsCleared, setNotificationsCleared] = useState(false);
  const [notificationTab, setNotificationTab] = useState<NotificationTab>('all');
  const [emailUpdates, setEmailUpdates] = useState(true);
  const [productUpdates, setProductUpdates] = useState(false);
  const notificationRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (!notificationRef.current?.contains(target)) setNotificationOpen(false);
      if (!profileRef.current?.contains(target)) setProfileOpen(false);
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setNotificationOpen(false);
        setProfileOpen(false);
        setActivePanel(null);
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        searchInputRef.current?.focus();
        setNotificationOpen(false);
        setProfileOpen(false);
      }
    }

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  useEffect(() => {
    setReadNotificationIds(new Set());
    setNotificationsCleared(false);
    setNotificationTab('all');
    setNotificationOpen(false);
    setProfileOpen(false);
    setActivePanel(null);
  }, [currentUser?.id, userRole]);

  const roleLabel =
    currentUser?.designation ||
    (userRole === 'Admin'
      ? 'College Administrator'
      : userRole === 'Teacher'
        ? 'Faculty Member'
        : 'Enrolled Learner');

  const initials = currentUser?.name
    ? currentUser.name
        .split(' ')
        .map((p) => p[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : userRole.slice(0, 1);

  const notificationsByRole: Record<'Admin' | 'Teacher' | 'Student', NotificationItem[]> = {
    Student: [
      {
        id: 'student-math-graded',
        title: 'Your math assignment is graded',
        description: 'Your latest assignment has been graded. Check your course results.',
        time: '10m ago',
        category: 'Academic & Placement',
        kind: 'warning',
        highPriority: true,
        unread: true,
      },
      {
        id: 'student-physics-announcement',
        title: 'New announcement from Physics class',
        description: 'Your Physics instructor shared a new class announcement.',
        time: '32m ago',
        category: 'LMS Engagement',
        kind: 'calendar',
        unread: true,
      },
      {
        id: 'student-weekly-summary',
        title: 'Weekly learning summary is ready',
        description: 'Review your learning activity and progress for this week.',
        time: '2h ago',
        category: 'LMS Engagement',
        kind: 'success',
        unread: true,
      },
      {
        id: 'student-advisor',
        title: 'Advisor check-in scheduled',
        description: 'Your academic advisor scheduled a progress check-in for this week.',
        time: 'Yesterday',
        category: 'Academic & Placement',
        kind: 'calendar',
        highPriority: true,
      },
      {
        id: 'student-profile',
        title: 'Profile information verified',
        description: 'Your student profile is up to date and ready for the new term.',
        time: '2 days ago',
        category: 'Account',
        kind: 'success',
      },
    ],
    Teacher: [
      {
        id: 'teacher-assignment-submitted',
        title: 'John Doe submitted Assignment 3',
        description: 'A student submission is ready for your review.',
        time: '10m ago',
        category: 'Academic & Placement',
        kind: 'warning',
        highPriority: true,
        unread: true,
      },
      {
        id: 'teacher-faculty-meeting',
        title: 'Faculty meeting at 3:00 PM',
        description: 'Reminder: the faculty meeting is scheduled for today at 3:00 PM.',
        time: '30m ago',
        category: 'Campus Calendar',
        kind: 'calendar',
        unread: true,
      },
      {
        id: 'teacher-progress-summary',
        title: 'Class progress summary is ready',
        description: 'Your latest class engagement summary is available.',
        time: '2h ago',
        category: 'LMS Engagement',
        kind: 'success',
        unread: true,
      },
      {
        id: 'teacher-watchlist',
        title: 'Students added to engagement watchlist',
        description: 'Three students may benefit from an early check-in this week.',
        time: 'Yesterday',
        category: 'LMS Engagement',
        kind: 'warning',
        highPriority: true,
      },
      {
        id: 'teacher-course-sync',
        title: 'Course roster synchronized',
        description: 'Your course roster and student records are up to date.',
        time: '2 days ago',
        category: 'System Update',
        kind: 'success',
      },
    ],
    Admin: [
      {
        id: 'admin-registration',
        title: 'New teacher registration request',
        description: 'A teacher account is waiting for administrator review.',
        time: '10m ago',
        category: 'Account Administration',
        kind: 'warning',
        highPriority: true,
        unread: true,
      },
      {
        id: 'admin-backup',
        title: 'System backup completed successfully',
        description: 'The latest campus analytics data backup finished successfully.',
        time: '1h ago',
        category: 'System Update',
        kind: 'success',
        unread: true,
      },
      {
        id: 'admin-campus-sync',
        title: 'Campus analytics are up to date',
        description: 'Student and intervention records have finished syncing.',
        time: '2h ago',
        category: 'LMS Engagement',
        kind: 'success',
        unread: true,
      },
      {
        id: 'admin-risk-alert',
        title: 'Cohort risk review is ready',
        description: 'Review the latest academic and placement risk indicators.',
        time: 'Yesterday',
        category: 'Academic & Placement',
        kind: 'warning',
        highPriority: true,
      },
      {
        id: 'admin-report',
        title: 'Monthly success report generated',
        description: 'The campus student-success summary is ready to review.',
        time: '2 days ago',
        category: 'Reports',
        kind: 'calendar',
      },
    ],
  };
  const notifications = notificationsByRole[userRole];
  const unreadCount = notificationsCleared
    ? 0
    : notifications.filter(
        (notification) => notification.unread && !readNotificationIds.has(notification.id),
      ).length;
  const hasUnread = unreadCount > 0;
  const visibleNotifications = notificationsCleared
    ? []
    : notifications.filter((notification) => {
      if (notificationTab === 'unread') {
        return notification.unread && !readNotificationIds.has(notification.id);
      }
        if (notificationTab === 'priority') return Boolean(notification.highPriority);
        return true;
      });

  function markAllNotificationsRead() {
    setReadNotificationIds(new Set(notifications.map((notification) => notification.id)));
  }

  function markNotificationRead(notificationId: string) {
    setReadNotificationIds((current) => new Set(current).add(notificationId));
  }

  function openPanel(panel: Exclude<Panel, null>) {
    setNotificationOpen(false);
    setProfileOpen(false);
    setActivePanel(panel);
  }

  function handleLogout() {
    setNotificationOpen(false);
    setProfileOpen(false);
    setActivePanel(null);
    onLogout();
  }

  return (
    <header className="sticky top-0 z-20 flex flex-col gap-3 border-b border-[#1e293b] bg-[#0c101c]/95 px-4 py-3 backdrop-blur-md sm:px-6 lg:h-16 lg:flex-row lg:items-center lg:justify-between lg:gap-5 lg:py-0">
      {/* Search Input */}
      <div className="relative w-full min-w-0 lg:max-w-md lg:flex-1">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
        <input
          ref={searchInputRef}
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search students by name, ID, department..."
          className="h-11 w-full rounded-xl border border-[#1e293b] bg-[#131b2e] pl-10 pr-4 text-sm text-slate-200 placeholder-slate-400 transition-colors focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
      </div>

      {/* Right Controls */}
      <div className="flex w-full min-w-0 flex-wrap items-center justify-end gap-2 sm:gap-3 lg:w-auto lg:flex-nowrap">
        {userRole !== 'Student' && (
          <button
            type="button"
            onClick={onOpenUpload}
            className="flex min-h-10 items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-indigo-600 px-3 py-2 text-xs font-semibold text-white shadow-md shadow-indigo-600/20 transition-colors hover:bg-indigo-500 sm:px-4"
            aria-label="Import student data"
          >
            <Upload size={14} />
            <span>Import Data</span>
          </button>
        )}

        {/* Toggle between Empty State & Loaded Data */}
        {userRole !== 'Student' &&
          (hasData ? (
            <button
              onClick={onResetData}
              title="Reset to empty state to view initial dashboard view"
              className="flex min-h-10 items-center gap-2 whitespace-nowrap rounded-xl border border-slate-700 bg-slate-800/80 px-3 py-2 text-xs font-medium text-slate-300 transition-colors hover:bg-slate-800"
            >
              <RefreshCw size={13} className="text-slate-400" />
              <span>Reset to Blank</span>
            </button>
          ) : (
            <button
              onClick={onLoadBenchmark}
              className="flex min-h-10 items-center gap-2 whitespace-nowrap rounded-xl bg-[#4f46e5] px-3.5 py-2 text-xs font-semibold text-white shadow-md shadow-indigo-600/30 transition-all hover:-translate-y-0.5 hover:bg-indigo-600"
            >
              <Sparkles size={13} />
              <span>Load Demo Data</span>
            </button>
          ))}

        <div className="relative" ref={notificationRef}>
          <button
            type="button"
            className={`relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors ${
              notificationOpen
                ? 'bg-slate-800 text-white'
                : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
            }`}
            aria-label="Notifications"
            aria-expanded={notificationOpen}
            aria-haspopup="dialog"
            onClick={() => {
              const willOpen = !notificationOpen;
              setNotificationOpen(willOpen);
              setProfileOpen(false);
            }}
          >
            <Bell size={18} />
            {hasUnread && (
              <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-[#0c101c]" />
            )}
          </button>

          {notificationOpen && (
            <div className="absolute right-0 top-full z-[70] mt-3 w-[min(30rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-slate-700/90 bg-[#0f172a] shadow-2xl shadow-black/60 ring-1 ring-white/5 animate-fade-in">
              <div className="border-b border-slate-800 bg-gradient-to-r from-indigo-500/[0.08] via-transparent to-violet-500/[0.08] px-4 py-4 sm:px-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-sm font-semibold tracking-wide text-white">Campus Notifications</h2>
                      <span className="rounded-full border border-indigo-400/25 bg-indigo-400/10 px-2 py-0.5 text-[10px] font-semibold text-indigo-200">
                        {unreadCount} unread
                      </span>
                    </div>
                    <p className="mt-1 text-[11px] text-slate-400">Updates for your {userRole.toLowerCase()} portal</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      type="button"
                      onClick={markAllNotificationsRead}
                      disabled={unreadCount === 0}
                      className="whitespace-nowrap rounded-lg px-2 py-1.5 text-[10px] font-semibold text-indigo-300 transition hover:bg-indigo-500/10 disabled:cursor-default disabled:text-slate-500"
                    >
                      <span aria-hidden="true">✓ </span>Mark read
                    </button>
                    <button
                      type="button"
                      onClick={() => setNotificationOpen(false)}
                      className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-800 hover:text-white"
                      aria-label="Close notifications"
                    >
                      <X size={15} />
                    </button>
                  </div>
                </div>

                <div className="mt-4 flex gap-1 overflow-x-auto rounded-xl bg-slate-950/60 p-1">
                  {([
                    ['all', `All (${notificationsCleared ? 0 : notifications.length})`],
                    ['unread', `Unread (${unreadCount})`],
                    ['priority', 'High Priority'],
                  ] as const).map(([tab, label]) => (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => setNotificationTab(tab)}
                      className={`shrink-0 rounded-lg px-3 py-2 text-[10px] font-semibold transition ${
                        notificationTab === tab
                          ? 'bg-indigo-600 text-white shadow-md shadow-indigo-950/40'
                          : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="max-h-[min(62vh,28rem)] space-y-2 overflow-y-auto p-3 sm:p-4">
                {visibleNotifications.length ? visibleNotifications.map((notification) => {
                  const isRead =
                    !notification.unread || readNotificationIds.has(notification.id);
                  const Icon = notification.kind === 'calendar'
                    ? CalendarDays
                    : notification.kind === 'warning'
                      ? TriangleAlert
                      : CheckCheck;
                  return (
                    <article
                      key={notification.id}
                      className={`relative overflow-hidden rounded-xl border border-slate-800 bg-[#131d30] p-3.5 transition hover:border-slate-700 ${
                        notification.highPriority ? 'border-l-2 border-l-rose-500' : ''
                      } ${!isRead ? 'bg-[#172238]' : ''}`}
                    >
                      <div className="flex items-start gap-3">
                        <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                          notification.kind === 'warning'
                            ? 'bg-amber-400/10 text-amber-300'
                            : notification.kind === 'calendar'
                              ? 'bg-violet-400/10 text-violet-300'
                              : 'bg-emerald-400/10 text-emerald-300'
                        }`}>
                          <Icon size={16} />
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <span className="rounded-md border border-slate-700/80 bg-slate-900/70 px-2 py-1 text-[9px] font-semibold uppercase tracking-wide text-slate-300">
                              {notification.category}
                            </span>
                            <span className="shrink-0 text-[10px] text-slate-500">{notification.time}</span>
                          </div>
                          <h3 className="mt-2 text-xs font-semibold leading-relaxed text-white">
                            {notification.title}
                            {notification.highPriority && (
                              <span className="ml-2 rounded-full bg-rose-500/10 px-1.5 py-0.5 align-middle text-[9px] font-semibold text-rose-300">
                                Priority
                              </span>
                            )}
                          </h3>
                          <p className="mt-1 text-[11px] leading-relaxed text-slate-400">
                            {notification.description}
                          </p>
                          <button
                            type="button"
                            onClick={() => {
                              markNotificationRead(notification.id);
                              openPanel('notifications');
                            }}
                            className="mt-2 inline-flex items-center gap-1 text-[10px] font-semibold text-indigo-300 transition hover:text-indigo-200"
                          >
                            Take action <ArrowRight size={12} />
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                }) : (
                  <div className="rounded-xl border border-dashed border-slate-700 bg-slate-900/40 px-4 py-8 text-center">
                    <Bell size={19} className="mx-auto text-slate-500" />
                    <p className="mt-2 text-xs font-medium text-slate-300">
                      {notificationsCleared ? 'All notifications cleared' : 'No notifications in this view'}
                    </p>
                    <p className="mt-1 text-[10px] text-slate-500">
                      You&apos;re all caught up for now.
                    </p>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between gap-3 border-t border-slate-800 bg-slate-950/40 px-4 py-3">
                <p className="truncate text-[10px] text-slate-500">
                  Current Portal: <span className="font-semibold text-slate-300">{userRole}</span>
                </p>
                <button
                  type="button"
                  onClick={() => setNotificationsCleared(true)}
                  disabled={notificationsCleared || notifications.length === 0}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2 py-1.5 text-[10px] font-medium text-slate-400 transition hover:bg-rose-500/10 hover:text-rose-300 disabled:cursor-default disabled:opacity-40"
                >
                  <Trash2 size={12} />
                  Clear all
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="relative border-l border-slate-800 pl-3" ref={profileRef}>
          <button
            type="button"
            onClick={() => {
              setProfileOpen((open) => !open);
              setNotificationOpen(false);
            }}
            className="flex min-h-10 items-center gap-2 rounded-xl px-1.5 py-1 transition hover:bg-slate-800/70"
            aria-label="User profile menu"
            aria-expanded={profileOpen}
            aria-haspopup="menu"
          >
            <span
              className={`flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br ${
                currentUser?.avatarColor || 'from-indigo-500 to-indigo-700'
              } text-xs font-semibold text-white shadow-md`}
            >
              {initials}
            </span>
            <span className="hidden min-w-0 text-left xl:block">
              <span className="block max-w-32 truncate text-xs font-bold leading-tight text-white">
                {currentUser?.name || userRole}
              </span>
              <span className="block max-w-40 truncate text-[11px] leading-tight text-slate-400">
                {roleLabel}
              </span>
            </span>
            <ChevronDown size={14} className="hidden text-slate-400 xl:block" />
          </button>

          {profileOpen && (
            <div
              role="menu"
              aria-label="Profile options"
              className="absolute right-0 top-full z-[70] mt-3 w-[min(21rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-slate-700/90 bg-[#0f172a] shadow-2xl shadow-black/60 ring-1 ring-white/5 animate-fade-in"
            >
              <div className="border-b border-slate-800 bg-gradient-to-br from-amber-400/[0.08] via-transparent to-violet-500/[0.12] p-4">
                <div className="flex items-start gap-3">
                  <span
                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-white/10 bg-gradient-to-br from-amber-300 via-orange-500 to-violet-600 text-sm font-bold text-white shadow-lg shadow-violet-950/40 ring-2 ring-white/5"
                  >
                    {initials}
                  </span>
                  <div className="min-w-0 flex-1 pt-0.5">
                    <p className="truncate text-sm font-semibold tracking-tight text-white">
                      {currentUser?.name || userRole}
                    </p>
                    <p className="truncate text-[11px] text-slate-400">
                      {currentUser?.email || 'No email on file'}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <span className="max-w-full truncate rounded-full border border-violet-400/25 bg-violet-400/10 px-2 py-1 text-[9px] font-semibold text-violet-200">
                        {roleLabel}
                      </span>
                      <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-300">
                        <i className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.7)]" />
                        Active
                      </span>
                    </div>
                  </div>
                </div>
                <p className="mt-4 border-t border-white/5 pt-3 text-[11px] text-slate-400">
                  Department:{' '}
                  <span className="font-medium text-slate-200">
                    {currentUser?.department ||
                      (userRole === 'Admin' ? 'Institutional Administration' : 'Not specified')}
                  </span>
                </p>
              </div>
              <div className="space-y-1 p-2">
                <MenuItem
                  icon={<Settings size={15} />}
                  label="Edit Campus Profile"
                  onClick={() => openPanel('profile')}
                />
                <MenuItem
                  icon={<ShieldCheck size={15} />}
                  label="Account Settings"
                  onClick={() => openPanel('settings')}
                />
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setProfileOpen(false);
                    searchInputRef.current?.focus();
                  }}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-xs font-medium text-slate-300 transition hover:bg-slate-800 hover:text-white"
                >
                  <Keyboard size={15} />
                  <span className="flex-1">Keyboard Shortcuts</span>
                  <kbd className="rounded-md border border-slate-700 bg-slate-950 px-1.5 py-1 font-mono text-[9px] text-slate-400">
                    Ctrl+K
                  </kbd>
                </button>
                <MenuItem
                  icon={<CircleHelp size={15} />}
                  label="Help & Support"
                  onClick={() => openPanel('help')}
                />
              </div>

              <div className="mx-3 border-t border-slate-800" />
              <div className="px-4 py-3">
                <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-slate-500">
                  Telemetry &amp; Infrastructure
                </p>
                <div className="mt-2.5 space-y-2">
                  <p className="flex items-center justify-between gap-2 text-[10px]">
                    <span className="flex min-w-0 items-center gap-2 text-slate-400">
                      <Sparkles size={12} className="shrink-0 text-violet-300" />
                      Groq AI Service
                    </span>
                    <span className="inline-flex shrink-0 items-center gap-1 font-medium text-emerald-300">
                      <i className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                      Connected
                    </span>
                  </p>
                  <p className="flex items-center gap-2 text-[10px] text-slate-400">
                    <Database size={12} className="shrink-0 text-cyan-300" />
                    SQLite Database Synced (v3.45)
                  </p>
                </div>
              </div>
              <div className="border-t border-slate-800 bg-slate-950/40 p-2">
                <button
                  type="button"
                  role="menuitem"
                  onClick={handleLogout}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-rose-500/20 bg-rose-500/[0.07] px-3 py-2.5 text-xs font-semibold text-rose-300 transition hover:border-rose-500/40 hover:bg-rose-500/15 hover:text-rose-200"
                >
                  <LogOut size={14} />
                  Sign Out of Portal
                </button>
              </div>
            </div>
          )}
        </div>

      </div>

      {activePanel && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/65 p-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setActivePanel(null);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="header-panel-title"
            className="w-full max-w-lg overflow-hidden rounded-2xl border border-slate-700 bg-[#111827] shadow-2xl shadow-black/50"
          >
            <div className="flex items-start justify-between border-b border-slate-800 px-5 py-4 sm:px-6">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-indigo-300">
                  {userRole} account
                </p>
                <h2 id="header-panel-title" className="mt-1 text-lg font-semibold text-white">
                  {activePanel === 'profile'
                    ? 'Profile'
                    : activePanel === 'settings'
                      ? 'Account Settings'
                      : activePanel === 'help'
                        ? 'Help & Support'
                        : 'All Notifications'}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setActivePanel(null)}
                className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-800 hover:text-white"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>
            <div className="max-h-[70vh] space-y-4 overflow-y-auto p-5 sm:p-6">
              {activePanel === 'profile' && (
                <>
                  <div className="flex items-center gap-4 rounded-xl border border-slate-800 bg-slate-900/60 p-4">
                    <span
                      className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${
                        currentUser?.avatarColor || 'from-indigo-500 to-indigo-700'
                      } text-lg font-bold text-white`}
                    >
                      {initials}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-white">{currentUser?.name || userRole}</p>
                      <p className="mt-1 text-xs text-slate-400">Logged in as {userRole}</p>
                    </div>
                  </div>
                  <DetailRow label="Name" value={currentUser?.name || 'Campus user'} />
                  <DetailRow label="Email" value={currentUser?.email || 'Not provided'} />
                  <DetailRow
                    label={userRole === 'Student' ? 'Student ID' : 'Account ID'}
                    value={currentUser?.studentId || currentUser?.id || 'Not available'}
                  />
                  <DetailRow label="Role" value={userRole} />
                </>
              )}

              {activePanel === 'settings' && (
                <>
                  <p className="text-sm leading-relaxed text-slate-400">
                    Choose which account updates you want to receive.
                  </p>
                  <SettingToggle
                    title="Email notifications"
                    description="Receive important campus updates by email."
                    checked={emailUpdates}
                    onChange={setEmailUpdates}
                  />
                  <SettingToggle
                    title="Product announcements"
                    description="Hear about new analytics features and improvements."
                    checked={productUpdates}
                    onChange={setProductUpdates}
                  />
                  <p className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3 text-xs text-emerald-200">
                    Your preferences are applied for this session.
                  </p>
                </>
              )}

              {activePanel === 'help' && (
                <>
                  <p className="text-sm leading-relaxed text-slate-400">
                    Find help with your {userRole.toLowerCase()} workspace or contact the campus
                    analytics support team.
                  </p>
                  <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
                    <div className="flex items-center gap-2 text-sm font-semibold text-white">
                      <ShieldCheck size={16} className="text-indigo-300" />
                      Account support
                    </div>
                    <p className="mt-2 text-xs leading-relaxed text-slate-400">
                      For access or data issues, contact your campus administrator. Include your
                      account email and a short description of the issue.
                    </p>
                    <a
                      href="mailto:support@cognitive-campus.example"
                      className="mt-3 inline-flex items-center gap-2 text-xs font-semibold text-indigo-300 hover:text-indigo-200"
                    >
                      <Mail size={14} />
                      Email support
                    </a>
                  </div>
                </>
              )}

              {activePanel === 'notifications' &&
                notifications.map((notification) => (
                  <article
                    key={notification.title}
                    className="rounded-xl border border-slate-800 bg-slate-900/50 p-4"
                  >
                    <p className="text-sm font-semibold text-white">{notification.title}</p>
                    <p className="mt-1.5 text-xs leading-relaxed text-slate-400">
                      {notification.description}
                    </p>
                    <p className="mt-2 text-[10px] text-slate-500">{notification.time}</p>
                  </article>
                ))}
            </div>
            <div className="flex justify-end border-t border-slate-800 px-5 py-3 sm:px-6">
              <button
                type="button"
                onClick={() => setActivePanel(null)}
                className="rounded-xl border border-slate-700 px-4 py-2 text-xs font-medium text-slate-300 transition hover:bg-slate-800 hover:text-white"
              >
                Close
              </button>
            </div>
          </section>
        </div>
      )}
    </header>
  );
}

function MenuItem({
  icon,
  label,
  onClick,
  destructive = false,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  destructive?: boolean;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-xs font-medium transition ${
        destructive
          ? 'text-rose-300 hover:bg-rose-500/10'
          : 'text-slate-300 hover:bg-slate-800 hover:text-white'
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-2 border-b border-slate-800/80 pb-3 last:border-0 last:pb-0">
      <span className="text-xs text-slate-400">{label}</span>
      <span className="max-w-[70%] break-all text-right text-xs font-medium text-slate-200">
        {value}
      </span>
    </div>
  );
}

function SettingToggle({
  title,
  description,
  checked,
  onChange,
}: {
  title: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-slate-800 bg-slate-900/50 p-4">
      <span>
        <span className="block text-sm font-medium text-slate-100">{title}</span>
        <span className="mt-1 block text-xs leading-relaxed text-slate-400">{description}</span>
      </span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="h-4 w-4 shrink-0 accent-indigo-500"
      />
    </label>
  );
}

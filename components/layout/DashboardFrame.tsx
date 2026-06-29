"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Baby,
  BarChart3,
  Bell,
  BrainCircuit,
  Cake,
  Calendar,
  CheckCheck,
  ChevronDown,
  ClipboardCheck,
  CreditCard,
  Dumbbell,
  ExternalLink,
  GraduationCap,
  HelpCircle,
  Home,
  Inbox,
  LayoutDashboard,
  Loader2,
  LogOut,
  Mail,
  Menu,
  Moon,
  MessageSquare,
  RefreshCw,
  Ruler,
  Search,
  Settings,
  ShieldAlert,
  Star,
  Sun,
  TrendingUp,
  Trophy,
  User,
  UserCheck,
  UserPlus,
  Users,
} from "lucide-react";
import { NAV_ITEMS, ROLE_ROUTES } from "@/lib/constants";
import { useCoachPermissions } from "@/lib/hooks/useCoachPermissions";
import { useRealtimeNotifications } from "@/lib/hooks/useRealtimeNotifications";
import { getNotificationHref, localizeNotification } from "@/lib/notifications";
import {
  useGetNotificationsQuery,
  useGetUnreadNotificationsCountQuery,
  useMarkAllNotificationsReadMutation,
  useMarkNotificationReadMutation,
} from "@/lib/store/api/calendarApi";
import type { CoachPermission } from "@/lib/store/api/calendarApi";
import {
  useGetAcademyQuery,
  useGetCurrentPermissionsQuery,
} from "@/lib/store/api/adminApi";
import type { UserRole } from "@/lib/types";
import { useAuth, useCurrentUser } from "@/lib/auth/auth-context";
import { useParentSelectedChild } from "@/lib/hooks/useParentSelectedChild";
import { cn, formatDateTime, getInitials } from "@/lib/utils";

const iconMap: Record<string, React.ElementType> = {
  Baby,
  BarChart3,
  Bell,
  BrainCircuit,
  Cake,
  Calendar,
  ClipboardCheck,
  CreditCard,
  Dumbbell,
  GraduationCap,
  Home,
  Inbox,
  LayoutDashboard,
  MessageSquare,
  Ruler,
  Settings,
  Star,
  TrendingUp,
  Trophy,
  User,
  UserCheck,
  UserPlus,
  Users,
};

const roleLabels: Record<UserRole, string> = {
  admin: "Academy OS",
  coach: "Coach Hub",
  player: "Player Hub",
  parent: "Family Hub",
};

const settingsRoutes: Partial<Record<UserRole, string>> = {
  admin: "/admin/settings",
  coach: "/coach/settings",
  player: "/player/settings",
};

const getExternalHref = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return "";
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
};

type DashboardLanguage = "en" | "ar";
type DashboardTheme = "light" | "dark";
type DashboardDensity = "comfortable" | "compact";
type DashboardMotion = "full" | "reduced";
type DashboardFocus = "off" | "on";

const arCopy: Record<string, string> = {
  "Academy OS": "نظام الأكاديمية",
  "Coach Hub": "لوحة المدرب",
  "Player Hub": "لوحة اللاعب",
  "Family Hub": "لوحة الأسرة",
  Menu: "القائمة",
  General: "عام",
  Settings: "الإعدادات",
  Help: "المساعدة",
  Logout: "تسجيل الخروج",
  Messages: "الرسائل",
  Chat: "المحادثة",
  Chats: "المحادثات",
  "Parent Notes": "ملاحظات ولي الأمر",
  "Family Notes": "ملاحظات الأسرة",
  "Switch child": "تغيير اللاعب",
  "Child Calendar": "تقويم اللاعب",
  "Child Matches": "مباريات اللاعب",
  "Child Performance": "أداء اللاعب",
  "Child Attendance": "حضور اللاعب",
  "Child Measurements": "قياسات اللاعب",
  "Payment Status": "حالة الدفع",
  "Payment History": "سجل المدفوعات",
  "Pay Now": "ادفع الآن",
  "Current Subscription": "الاشتراك الحالي",
  "Recent Invoices": "آخر الفواتير",
  "Payment Method": "طريقة الدفع",
  "Card Details": "بيانات البطاقة",
  "Mobile Wallet": "المحفظة الإلكترونية",
  "Bank Transfer Details": "بيانات التحويل البنكي",
  "Summary": "الملخص",
  "Total due": "إجمالي المستحق",
  Paid: "مدفوع",
  "Due Date": "تاريخ الاستحقاق",
  "Paid Date": "تاريخ الدفع",
  "Outstanding balance": "رصيد مستحق",
  "Review Payment": "مراجعة الدفع",
  "No invoices yet": "لا توجد فواتير بعد",
  "No invoices yet.": "لا توجد فواتير بعد.",
  "No outstanding invoices. You are all caught up.": "لا توجد فواتير مستحقة. كل شيء محدث.",
  "Payment access is not enabled for this child.": "صلاحية المدفوعات غير مفعلة لهذا اللاعب.",
  "Payment request prepared": "تم تجهيز طلب الدفع",
  "Final collection depends on the connected payment gateway.": "التحصيل النهائي يعتمد على بوابة الدفع المتصلة.",
  "Secure payment gateway ready": "بوابة الدفع الآمنة جاهزة",
  "Link parent": "ربط ولي الأمر",
  "Create parent-player link": "إنشاء ربط ولي أمر بلاعب",
  "Active links": "الروابط النشطة",
  "Parent account": "حساب ولي الأمر",
  "Relation": "صلة القرابة",
  "Primary child": "اللاعب الأساسي",
  "Progress": "التقدم",
  "Coach chat": "محادثة المدرب",
  "Link every parent account to one or more players and control exactly what each parent can see.": "اربط كل حساب ولي أمر بلاعب أو أكثر وحدد بدقة ما يمكنه رؤيته.",
  "Search parent, player, phone...": "ابحث عن ولي أمر أو لاعب أو رقم هاتف...",
  "No parent links yet.": "لا توجد روابط لأولياء الأمور بعد.",
  "Loading parent links...": "جاري تحميل روابط أولياء الأمور...",
  "Choose parent...": "اختر ولي الأمر...",
  "Choose player...": "اختر اللاعب...",
  "Family performance hub": "مركز متابعة الأسرة",
  "Weekly parent report": "التقرير الأسبوعي لولي الأمر",
  Highlights: "أبرز النقاط",
  "Action items": "خطوات مقترحة",
  "Height": "الطول",
  "Weight": "الوزن",
  "BMI": "مؤشر كتلة الجسم",
  "Preferred Foot": "القدم المفضلة",
  "Profile": "الملف الشخصي",
  "Measurement History": "سجل القياسات",
  "Measured at": "تاريخ القياس",
  "Speed": "السرعة",
  "Agility": "الرشاقة",
  "No measurement history has been recorded yet.": "لم يتم تسجيل قياسات بعد.",
  "Loading measurements...": "جاري تحميل القياسات...",
  "Loading payments...": "جاري تحميل المدفوعات...",
  "Loading payment history...": "جاري تحميل سجل المدفوعات...",
  "Loading calendar...": "جاري تحميل التقويم...",
  "Loading matches...": "جاري تحميل المباريات...",
  "Loading performance...": "جاري تحميل الأداء...",
  "Loading attendance...": "جاري تحميل الحضور...",
  "No linked child found for this parent account.": "لا يوجد لاعب مرتبط بحساب ولي الأمر.",
  "No calendar events yet.": "لا توجد أحداث في التقويم بعد.",
  "No matches yet.": "لا توجد مباريات بعد.",
  "No visible evaluations yet.": "لا توجد تقييمات ظاهرة بعد.",
  "No attendance records yet.": "لا توجد سجلات حضور بعد.",
  "Current academy profile measurements": "قياسات ملف الأكاديمية الحالية",
  "Physical profile for your linked player.": "الملف البدني للاعب المرتبط بحسابك.",
  "live performance overview": "نظرة مباشرة على الأداء",
  "Performance overview for your linked player.": "نظرة على أداء اللاعب المرتبط بحسابك.",
  "attendance record": "سجل الحضور",
  "Attendance record for your linked player.": "سجل حضور اللاعب المرتبط بحسابك.",
  "Training Rating": "تقييم التدريب",
  "Match Rating": "تقييم المباراة",
  "Goal Contributions": "المساهمات التهديفية",
  "Score Trend": "اتجاه النتيجة",
  "Skill Breakdown": "تفصيل المهارات",
  "Coach Evaluations": "تقييمات المدرب",
  "Overall Score": "النتيجة العامة",
  "Technical": "فني",
  "Tactical": "تكتيكي",
  "Physical": "بدني",
  "Mental": "ذهني",
  "Minutes": "الدقائق",
  "Goals": "الأهداف",
  "Assists": "التمريرات الحاسمة",
  "Not selected yet": "لم يتم الاختيار بعد",
  "Training, matches, and academy events for your child.": "التدريبات والمباريات وأحداث الأكاديمية الخاصة باللاعب.",
  "Upcoming matches, squad selection, and post-match stats.": "المباريات القادمة واختيار القائمة وإحصائيات ما بعد المباراة.",
  "Make a payment for your child's subscription": "ادفع اشتراك اللاعب.",
  "All past payments and invoices": "كل المدفوعات والفواتير السابقة",
  "All invoices for": "كل فواتير",
  "Review outstanding invoices for": "راجع الفواتير المستحقة لـ",
  "Outstanding Invoices": "الفواتير المستحقة",
  "Credit Card": "بطاقة ائتمان",
  "Bank Transfer": "تحويل بنكي",
  "Provider": "مزود الخدمة",
  "Phone Number": "رقم الهاتف",
  "Bank Name": "اسم البنك",
  "Reference": "المرجع",
  "Use the reference above so the academy can reconcile the payment quickly.": "استخدم المرجع بالأعلى حتى تتمكن الأكاديمية من مطابقة الدفع بسرعة.",
  "Card Number": "رقم البطاقة",
  "Expiry": "تاريخ الانتهاء",
  "CVV": "رمز الأمان",
  "Name on Card": "الاسم على البطاقة",
  "Guardian name": "اسم ولي الأمر",
  "Total": "الإجمالي",
  "Processing...": "جاري المعالجة...",
  "Plan": "الخطة",
  "Amount": "المبلغ",
  "Period": "الفترة",
  "Status": "الحالة",
  "Next payment": "الدفعة القادمة",
  "Due": "مستحق",
  "Date": "التاريخ",
  "paid": "مدفوع",
  "pending": "معلق",
  "overdue": "متأخر",
  "cancelled": "ملغي",
  "active": "نشط",
  "expired": "منتهي",
Contacts: "جهات الاتصال",
  Contact: "جهة اتصال",
  Admin: "المدير",
  "Admin session": "حصة مع الإدارة",
  "Admin Session": "حصة مع الإدارة",
  "Family chat": "محادثة الأسرة",
  "Family chat -": "محادثة الأسرة -",
  Coach: "المدرب",
  Player: "اللاعب",
  Parent: "ولي الأمر",
  Admins: "المديرون",
  Parents: "أولياء الأمور",
  "Head coach": "المدرب الرئيسي",
  "Assistant coach": "المدرب المساعد",
  "Goalkeeper coach": "مدرب حراس المرمى",
  "Fitness coach": "مدرب اللياقة",
  "Sign in again to use chat.": "سجل الدخول مرة أخرى لاستخدام المحادثات.",
  "No chats match your search.": "لا توجد محادثات تطابق البحث.",
  "No chats yet.": "لا توجد محادثات بعد.",
  "Select a chat": "اختر محادثة",
  "No messages yet.": "لا توجد رسائل بعد.",
  "No chat selected.": "لم يتم اختيار محادثة.",
  "No contacts.": "لا توجد جهات اتصال.",
  "Close session": "إغلاق الحصة",
  "Session closed.": "الحصة مغلقة.",
  "Conversation closed": "المحادثة مغلقة",
  "This conversation is closed.": "هذه المحادثة مغلقة.",
  closed: "مغلق",
  open: "مفتوح",
  You: "أنت",
  User: "مستخدم",
  Read: "مقروء",
  Delivered: "تم التسليم",
  edited: "تم التعديل",
  "Edit message": "تعديل الرسالة",
  "Delete message": "حذف الرسالة",
  "Editing message": "جاري تعديل الرسالة",
  "Attach image": "إرفاق صورة",
  "Chat image": "صورة المحادثة",
  Image: "صورة",
  Message: "اكتب رسالة",
  Send: "إرسال",
  "Chat request failed": "تعذر تنفيذ طلب المحادثة.",
  "Unable to load chat": "تعذر تحميل المحادثات.",
  "Unable to load messages": "تعذر تحميل الرسائل.",
  "Unable to open chat": "تعذر فتح المحادثة.",
  "Unable to close session": "تعذر إغلاق الحصة.",
  "Unable to send message": "تعذر إرسال الرسالة.",
  "Unable to delete message": "تعذر حذف الرسالة.",
  "Live chat connection failed": "فشل اتصال المحادثة المباشر.",
  Notifications: "الإشعارات",
  "Search players, sessions, matches...": "ابحث عن لاعبين أو حصص أو مباريات...",
  "Goalix AI Coach": "مدرب Goalix الذكي",
  "Daily insights for performance, attendance and match readiness.": "رؤى يومية للأداء والحضور وجاهزية المباريات.",
  "Open Insights": "فتح الرؤى",
  Arabic: "العربية",
  English: "الإنجليزية",
  "Dark theme": "الوضع الداكن",
  "Light theme": "الوضع الفاتح",
  Dashboard: "الرئيسية",
  Academy: "الأكاديمية",
  Branches: "الفروع",
  "Birth Years": "سنوات الميلاد",
  Groups: "المجموعات",
  Coaches: "المدربون",
  "All Coaches": "كل المدربين",
  "Assign Coach": "تعيين مدرب",
  Assignments: "التكليفات",
  "Submit coach assignments and your daily assignment.": "سلّم واجبات المدرب والواجب اليومي.",
  "Daily Assignment": "الواجب اليومي",
  daily: "يومي",
  "How many hours did you sleep today?": "نمت كام ساعة النهارده؟",
  "Did you train today?": "اتمرنت النهارده؟",
  "How many meals did you eat today?": "كلت كام وجبة النهارده؟",
  "Submitted today's answer.": "تم تسليم إجابة النهارده.",
  "You have not submitted today's answer yet.": "لسه ما سلمتش إجابة النهارده.",
  Players: "اللاعبون",
  Calendar: "التقويم",
  Matches: "المباريات",
  "All Matches": "كل المباريات",
  Archive: "الأرشيف",
  Registrations: "التسجيلات",
  Attendance: "الحضور",
  Overview: "نظرة عامة",
  Sessions: "الحصص",
  Rankings: "الترتيب",
  Weekly: "الأسبوعي",
  Monthly: "الشهري",
  Payments: "المدفوعات",
  Subscriptions: "الاشتراكات",
  Invoices: "الفواتير",
  Reports: "التقارير",
  Center: "المركز",
  Compose: "إنشاء",
  "Player Progress": "تقدم اللاعب",
  "Academy Profile": "ملف الأكاديمية",
  "Player Options": "خيارات اللاعبين",
  "Roles & Permissions": "الأدوار والصلاحيات",
  Integrations: "التكاملات",
  Home: "الرئيسية",
  Birthdays: "أعياد الميلاد",
  "My Groups": "مجموعاتي",
  History: "السجل",
  Evaluations: "التقييمات",
  "New Evaluation": "تقييم جديد",
  Measurements: "القياسات",
  Training: "التدريب",
  "All Training": "كل التدريب",
  "Create Training": "إنشاء تدريب",
  Schedule: "الجدول",
  "My Calendar": "تقويمي",
  "Session Detail": "تفاصيل الحصة",
  "Match Evaluations": "تقييمات المباريات",
  Configuration: "الإعدادات",
  Performance: "الأداء",
  Ranking: "الترتيب",
  "My Ranking": "ترتيبي",
  "Your Rank": "ترتيبك",
  "Group Leaderboard": "ترتيب المجموعة",
  "Rankings in your group": "الترتيب داخل مجموعتك",
  "Loading rankings...": "جاري تحميل الترتيب...",
  "No backend ranking snapshot is available for your group yet.": "لا توجد لقطة ترتيب متاحة لمجموعتك حتى الآن.",
  Points: "النقاط",
  "Progress Chart": "مخطط التقدم",
  "My Plan": "خطتي",
  "My Training Plan": "خطة تدريبي",
  "Personalized training program": "برنامج تدريبي مخصص",
  "Weekly Goals": "أهداف الأسبوع",
  Done: "مكتمل",
  "Complete 3 ball control sessions": "إكمال 3 حصص للتحكم بالكرة",
  "Run 5km total in interval training": "الجري 5 كم إجمالا في التدريب المتقطع",
  "Practice free kicks (50 attempts)": "تدريب الركلات الحرة (50 محاولة)",
  "Watch tactical analysis video": "مشاهدة فيديو التحليل التكتيكي",
  "Attend all scheduled sessions": "حضور كل الحصص المجدولة",
  "Ball Control Drills": "تدريبات التحكم بالكرة",
  "Juggling, first touch exercises, and close control dribbling": "تنطيط الكرة، تدريبات اللمسة الأولى، والمراوغة بتحكم قريب",
  "30 min": "30 دقيقة",
  "Every session": "كل حصة",
  high: "مرتفع",
  medium: "متوسط",
  low: "منخفض",
  "Defensive Awareness": "الوعي الدفاعي",
  "Positional play exercises and tracking runs": "تدريبات التمركز وتتبع التحركات",
  "20 min": "20 دقيقة",
  "3x per week": "3 مرات أسبوعيا",
  "Speed & Agility": "السرعة والرشاقة",
  "Sprint drills, ladder exercises, and cone work": "تدريبات السرعة، السلم، والأقماع",
  "25 min": "25 دقيقة",
  "2x per week": "مرتان أسبوعيا",
  "Leadership Development": "تطوير القيادة",
  "Team captain exercises, communication drills": "تدريبات قائد الفريق وتمارين التواصل",
  "15 min": "15 دقيقة",
  "Endurance Training": "تدريب التحمل",
  "Long runs, interval training, and recovery protocols": "جري طويل، تدريب متقطع، وبروتوكولات استشفاء",
  "40 min": "40 دقيقة",
  Child: "الطفل",
  "Status Breakdown": "تفصيل الحالة",
  "Status Distribution": "توزيع الحالة",
  "Payment Status Distribution": "توزيع حالة الدفع",
  "Payment Breakdown": "تفصيل المدفوعات",
  "Revenue by Status": "الإيرادات حسب الحالة",
  "Attendance Overview": "نظرة عامة على الحضور",
  "Attendance by Group": "الحضور حسب المجموعة",
  "Attendance Records": "سجلات الحضور",
  "Attendance Rate": "معدل الحضور",
  "Overall Rate": "المعدل العام",
  "Total Sessions": "إجمالي الحصص",
  "Latest Status": "آخر حالة",
  Breakdown: "التفصيل",
  Records: "السجلات",
  Rate: "المعدل",
  "No group data available.": "لا توجد بيانات مجموعات متاحة.",
  "No attendance statuses have been recorded yet.": "لم يتم تسجيل حالات حضور حتى الآن.",
  "No training or match attendance has been recorded for you yet.": "لم يتم تسجيل حضور تدريب أو مباريات لك حتى الآن.",
  "No records": "لا توجد سجلات",
  "Nothing recorded yet": "لم يتم تسجيل شيء بعد",
  "Training records": "سجلات التدريب",
  "Match records": "سجلات المباريات",
  "recorded sessions attended": "حصص مسجلة تم حضورها",
  "Your recorded training and match attendance from the academy database.": "حضورك المسجل في التدريبات والمباريات من قاعدة بيانات الأكاديمية.",
  "Welcome back, Admin": "أهلا بعودتك، المدير",
  "Welcome back, Coach": "أهلا بعودتك، المدرب",
  "Welcome back, Player": "أهلا بعودتك، اللاعب",
  "Welcome back, Parent": "أهلا بعودتك، ولي الأمر",
  "Here's your academy performance overview": "نظرة عامة على أداء الأكاديمية",
  "Here's your personal performance overview": "نظرة عامة على أدائك الشخصي",
  "Here's your child's journey at a glance": "نظرة سريعة على رحلة طفلك",
  "Here is your team performance overview for today.": "نظرة عامة على أداء فريقك اليوم.",
  "Focus on the process, the results will follow.": "ركز على العملية وستأتي النتائج.",
  "- Coach": "- المدرب",
  "Match Readiness": "جاهزية المباراة",
  "Team Form": "مستوى الفريق",
  Possession: "الاستحواذ",
  "xG (For)": "الأهداف المتوقعة",
  "Sprint Load": "حمل السرعات",
  "Last 5 Matches": "آخر 5 مباريات",
  "Last 5 matches": "آخر 5 مباريات",
  "Controlled phases": "مراحل السيطرة",
  "Training target": "هدف التدريب",
  "Per 90": "لكل 90 دقيقة",
  "vs last week": "مقارنة بالأسبوع الماضي",
  "Squad prepared": "الفريق جاهز",
  "Active Players": "لاعبون نشطون",
  Availability: "الإتاحة",
  "Team Rating": "تقييم الفريق",
  "Training Groups": "مجموعات التدريب",
  "Lineup Review": "مراجعة التشكيل",
  "Training Session": "حصة تدريب",
  "Video Analysis": "تحليل الفيديو",
  "Injury Follow-up": "متابعة الإصابة",
  "Opposition Report": "تقرير المنافس",
  "vs FC United": "ضد إف سي يونايتد",
  "Today, 16:00": "اليوم، 16:00",
  Yesterday: "أمس",
  "2 Players": "لاعبان",
  "Recovery Session": "حصة استشفاء",
  "Tactical Training": "تدريب تكتيكي",
  "High Intensity": "شدة عالية",
  "Set Piece Practice": "تدريب الكرات الثابتة",
  "Match Preparation": "تحضير المباراة",
  Matchday: "يوم المباراة",
  "Team High": "أعلى الفريق",
  "Team Avg": "متوسط الفريق",
  "This Season": "هذا الموسم",
  "Top Speed": "أعلى سرعة",
  Distance: "المسافة",
  "Win Rate": "نسبة الفوز",
  "ELO": "تصنيف ELO",
  "Coach performance hub": "مركز أداء المدرب",
  "Mark Attendance": "تسجيل الحضور",
  "U13 Elite Group": "مجموعة U13 النخبة",
  "Review last match": "مراجعة آخر مباراة",
  Ready: "جاهز",
  Monitor: "تحت المتابعة",
  Recovery: "استشفاء",
  Intensity: "الشدة",
  "Set Pieces": "الكرات الثابتة",
  "Match Prep": "تحضير المباراة",
  "Coach Impact": "تأثير المدرب",
  "Coach Actions": "إجراءات المدرب",
  "View plan": "عرض الخطة",
  "Focus Players": "لاعبون تحت التركيز",
  "Group Overview": "نظرة على المجموعات",
  "New Reports": "تقارير جديدة",
  "Today's Sessions": "حصص اليوم",
  "Group Readiness": "جاهزية المجموعة",
  "Upcoming Match": "المباراة القادمة",
  "Upcoming Matches": "المباريات القادمة",
  "Quick Actions": "إجراءات سريعة",
  "Team Overview": "نظرة على الفريق",
  "Last Match": "آخر مباراة",
  "Training Readiness": "جاهزية التدريب",
  Optimal: "مثالي",
  "Sprint Speed": "سرعة العدو",
  "Distance Covered": "المسافة المقطوعة",
  "Recovery Score": "مؤشر الاستشفاء",
  Stamina: "التحمل",
  "Physical Load": "الحمل البدني",
  "Acute Load": "الحمل الحاد",
  "Chronic Load": "الحمل المزمن",
  "High Speed": "سرعة عالية",
  High: "مرتفع",
  "Minutes Played": "دقائق اللعب",
  "Shots on Target": "تسديدات على المرمى",
  "Pass Completion": "دقة التمرير",
  "Key Passes": "تمريرات مفتاحية",
  Sleep: "النوم",
  Fatigue: "الإجهاد",
  Low: "منخفض",
  Mon: "الإثنين",
  Tue: "الثلاثاء",
  Wed: "الأربعاء",
  Thu: "الخميس",
  Fri: "الجمعة",
  Sat: "السبت",
  Sun: "الأحد",
  "Speed Training": "تدريب السرعة",
  "Technical Drills": "تدريبات فنية",
  "Strength Training": "تدريب القوة",
  "Tactical Session": "حصة تكتيكية",
  "Rest Day": "راحة",
  Winger: "جناح",
  Age: "العمر",
  Foot: "القدم",
  Left: "يسار",
  Right: "يمين",
  "Performance Trend": "اتجاه الأداء",
  "Last 8 Matches": "آخر 8 مباريات",
  "Training Schedule": "جدول التدريب",
  Heatmap: "الخريطة الحرارية",
  "(Last Match)": "(آخر مباراة)",
  "Key Stats": "إحصائيات رئيسية",
  "Coach Feedback": "ملاحظات المدرب",
  "Great intensity and movement. Your decision making in the final third is improving.": "شدة وحركة ممتازة. قراراتك في الثلث الأخير تتحسن.",
  Wellness: "العافية",
  "Weekly Training Schedule": "جدول التدريب الأسبوعي",
  "This Week": "هذا الأسبوع",
  "vs City Rovers": "ضد سيتي روفرز",
  "Saturday, 31 May": "السبت، 31 مايو",
  "Riverside Stadium": "ملعب ريفرسايد",
  "Away Match": "مباراة خارج الأرض",
  Weather: "الطقس",
  "Focus Area": "منطقة التركيز",
  "Final Third": "الثلث الأخير",
  "Season Highlights": "أبرز أرقام الموسم",
  "Avg Rating": "متوسط التقييم",
  Achievements: "الإنجازات",
  "Player of the Match": "لاعب المباراة",
  "Top Performer": "أفضل أداء",
  "Consistency Streak": "سلسلة الثبات",
  "Next Milestone": "الهدف التالي",
  "Goal Contribution": "مساهمة تهديفية",
  "2 more to unlock": "باقي 2 للفتح",
  Participation: "المشاركة",
  Great: "رائع",
  "On Track": "على المسار",
  "Overall Progress": "التقدم العام",
  Striker: "مهاجم",
  "View Full Profile": "عرض الملف الكامل",
  "Training Participation": "المشاركة في التدريب",
  "On-Time Rate": "الالتزام بالوقت",
  "Session Rating": "تقييم الحصة",
  "Safety Status": "حالة السلامة",
  "vs last season": "مقارنة بالموسم الماضي",
  Alerts: "التنبيهات",
  "View All": "عرض الكل",
  "Training time change": "تغيير وقت التدريب",
  "Tomorrow, 20 May": "غدًا، 20 مايو",
  "Bring: Shin guards": "أحضر واقيات الساق",
  "Equipment Reminder": "تذكير بالمعدات",
  "Match day": "يوم المباراة",
  "unread alerts": "تنبيهات غير مقروءة",
  unread: "غير مقروء",
  "Read all": "تحديد الكل كمقروء",
  "Refresh notifications": "تحديث الإشعارات",
  "Loading notifications...": "جاري تحميل الإشعارات...",
  "Could not load notifications.": "تعذر تحميل الإشعارات.",
  "No notifications yet.": "لا توجد إشعارات بعد.",
  "View all notifications": "عرض كل الإشعارات",
  "Skill Development": "تطوير المهارات",
  Finishing: "إنهاء الهجمة",
  Passing: "التمرير",
  Dribbling: "المراوغة",
  Defending: "الدفاع",
  "Game IQ": "ذكاء اللعب",
  "Performance Heatmap": "خريطة الأداء",
  "Attacking Direction": "اتجاه الهجوم",
  "Coach Notes": "ملاحظات المدرب",
  "Coach Alex": "المدرب أليكس",
  "Noah has shown great improvement in movement off the ball and finishing in training.": "أظهر نوح تطورًا كبيرًا في الحركة بدون كرة وإنهاء الهجمات في التدريب.",
  "Hard Worker": "مجتهد",
  "Team Player": "لاعب جماعي",
  "Wellness Summary": "ملخص العافية",
  Energy: "الطاقة",
  Mood: "المزاج",
  Positive: "إيجابي",
  Soreness: "الإجهاد العضلي",
  "Upcoming Sessions": "الحصص القادمة",
  "View Full Schedule": "عرض الجدول الكامل",
  Today: "اليوم",
  "Technical Training": "تدريب فني",
  "Strength & Conditioning": "القوة واللياقة",
  "Match Day": "يوم المباراة",
  "Recent Match": "آخر مباراة",
  Win: "فوز",
  "Academic Progress": "التقدم الدراسي",
  Maths: "الرياضيات",
  Science: "العلوم",
  PE: "التربية الرياضية",
  "Overall Average": "المتوسط العام",
  Communication: "التواصل",
  "Team Group": "مجموعة الفريق",
  "Coach Alex: Great session everyone!": "المدرب أليكس: حصة رائعة للجميع!",
  "Direct Message": "رسالة مباشرة",
  "Let's chat about Noah's progress.": "لنتحدث عن تقدم نوح.",
  "Documents & Forms": "المستندات والنماذج",
  "Medical Consent Form": "نموذج الموافقة الطبية",
  "Code of Conduct": "مدونة السلوك",
  "Photo & Video Consent": "موافقة الصور والفيديو",
  Valid: "صالح",
  Accepted: "مقبول",
  "Payments & Subscription": "المدفوعات والاشتراك",
  "Current Plan": "الخطة الحالية",
  Active: "نشط",
  "Next Payment": "الدفع القادم",
  "Auto-pay ON": "الدفع التلقائي مفعل",
  "Family Access": "وصول العائلة",
  "Mother": "الأم",
  "Primary Contact": "جهة الاتصال الأساسية",
  "Full Access": "وصول كامل",
  Father: "الأب",
  "View Access": "عرض الوصول",
  "Invite Family Member": "دعوة فرد من العائلة",
  "Noah Williams": "نوح ويليامز",
  "Liam Carter": "ليام كارتر",
  "Ethan Brooks": "إيثان بروكس",
  "Mason Lee": "ماسون لي",
  "Sarah Williams": "سارة ويليامز",
  "Mark Williams": "مارك ويليامز",
  "GOALIX FC": "جوليكس إف سي",
  "City Rovers": "سيتي روفرز",
  "GOALIX Elite Annual": "باقة Goalix Elite السنوية",
};

const fallbackArTerms: Record<string, string> = {
  "Matches Management": "إدارة المباريات",
  "Create Match": "إنشاء مباراة",
  "Add Match": "إضافة مباراة",
  "Delete Match Forever": "حذف المباراة نهائيا",
  "Save Postponement": "حفظ التأجيل",
  "Postpone Match": "تأجيل المباراة",
  "Matches Calendar": "تقويم المباريات",
  "Select coach for this match": "اختر مدربا لهذه المباراة",
  "Leave empty if not confirmed": "اتركه فارغا إذا لم يتم التأكيد",
  "Weather, opponent request, pitch availability...": "الطقس، طلب المنافس، توفر الملعب...",
  "No data found": "لا توجد بيانات",
  "There are no items to display at this time.": "لا توجد عناصر للعرض حاليا.",
  "Search...": "بحث...",
  "Loading...": "جاري التحميل...",
  "Show": "عرض",
  "Showing": "يعرض",
  "of": "من",
  "Confirm": "تأكيد",
  "Cancel": "إلغاء",
  "Save": "حفظ",
  "Delete": "حذف",
  "Edit": "تعديل",
  "Add": "إضافة",
  "Create": "إنشاء",
  "Update": "تحديث",
  "Remove": "إزالة",
  "View": "عرض",
  "Open": "فتح",
  "Close": "إغلاق",
  "Search": "بحث",
  "Filter": "تصفية",
  "Filters": "الفلاتر",
  "Clear": "مسح",
  "Apply": "تطبيق",
  "Reset": "إعادة ضبط",
  "Submit": "إرسال",
  "Name": "الاسم",
  "Full Name": "الاسم الكامل",
  "Email": "البريد الإلكتروني",
  "Phone": "الهاتف",
  "Role": "الدور",
  "Status": "الحالة",
  "Actions": "الإجراءات",
  "Details": "التفاصيل",
  "Description": "الوصف",
  "Notes": "ملاحظات",
  "Reason": "السبب",
  "Title": "العنوان",
  "Type": "النوع",
  "Category": "الفئة",
  "Priority": "الأولوية",
  "Progress": "التقدم",
  "Date": "التاريخ",
  "Time": "الوقت",
  "New date": "تاريخ جديد",
  "New time": "وقت جديد",
  "Location": "الموقع",
  "Location / Stadium": "الموقع / الملعب",
  "Stadium": "الملعب",
  "Venue": "المكان",
  "Venue Type": "نوع المكان",
  "Opponent": "المنافس",
  "Organizer Notes": "ملاحظات المنظم",
  "Referee": "الحكم",
  "Friendly?": "ودية؟",
  "Friendly": "ودية",
  "Not Friendly (Official)": "ليست ودية (رسمية)",
  "Training Match": "مباراة تدريبية",
  "Neutral": "محايد",
  "Away": "خارج الأرض",
  "Home": "الرئيسية",
  "Dashboard": "الرئيسية",
  "Admin": "المدير",
  "Coach": "المدرب",
  "Player": "اللاعب",
  "Parent": "ولي الأمر",
  "Academy": "الأكاديمية",
  "Branch": "الفرع",
  "Branches": "الفروع",
  "Group": "المجموعة",
  "Groups": "المجموعات",
  "Birth Year": "سنة الميلاد",
  "Birth Years": "سنوات الميلاد",
  "Match": "المباراة",
  "Matches": "المباريات",
  "Training": "التدريب",
  "Session": "الحصة",
  "Sessions": "الحصص",
  "Attendance": "الحضور",
  "Evaluation": "التقييم",
  "Evaluations": "التقييمات",
  "Measurement": "القياس",
  "Measurements": "القياسات",
  "Ranking": "الترتيب",
  "Rankings": "الترتيب",
  "Payment": "الدفع",
  "Payments": "المدفوعات",
  "Invoice": "الفاتورة",
  "Invoices": "الفواتير",
  "Subscription": "الاشتراك",
  "Subscriptions": "الاشتراكات",
  "Notification": "الإشعار",
  "Notifications": "الإشعارات",
  "Report": "التقرير",
  "Reports": "التقارير",
  "Calendar": "التقويم",
  "Schedule": "الجدول",
  "Profile": "الملف الشخصي",
  "Performance": "الأداء",
  "Settings": "الإعدادات",
  "Configuration": "الإعدادات",
  "Archive": "الأرشيف",
  "History": "السجل",
  "Compose": "إنشاء",
  "Overview": "نظرة عامة",
  "Summary": "ملخص",
  "Active": "نشط",
  "Inactive": "غير نشط",
  "Pending": "قيد الانتظار",
  "Completed": "مكتمل",
  "Approved": "مقبول",
  "Rejected": "مرفوض",
  "Draft": "مسودة",
  "Published": "منشور",
  "Finished": "منتهي",
  "Postponed": "مؤجل",
  "Scheduled": "مجدول",
  "Present": "حاضر",
  "Absent": "غائب",
  "Late": "متأخر",
  "Excused": "بعذر",
  "Paid": "مدفوع",
  paid: "مدفوع",
  "Unpaid": "غير مدفوع",
  unpaid: "غير مدفوع",
  pending: "قيد الانتظار",
  overdue: "متأخر",
  "Valid": "صالح",
  "Expired": "منتهي",
  "High": "مرتفع",
  "Medium": "متوسط",
  "Low": "منخفض",
  "Today": "اليوم",
  "Tomorrow": "غدا",
  "Yesterday": "أمس",
  "This Week": "هذا الأسبوع",
  "This Month": "هذا الشهر",
  "This Season": "هذا الموسم",
  "Last Week": "الأسبوع الماضي",
  "Last Month": "الشهر الماضي",
  "Last Season": "الموسم الماضي",
  "January": "يناير",
  "February": "فبراير",
  "March": "مارس",
  "April": "أبريل",
  "May": "مايو",
  "June": "يونيو",
  "July": "يوليو",
  "August": "أغسطس",
  "September": "سبتمبر",
  "October": "أكتوبر",
  "November": "نوفمبر",
  "December": "ديسمبر",
  "Jan": "يناير",
  "Feb": "فبراير",
  "Mar": "مارس",
  "Apr": "أبريل",
  "Jun": "يونيو",
  "Jul": "يوليو",
  "Aug": "أغسطس",
  "Sep": "سبتمبر",
  "Oct": "أكتوبر",
  "Nov": "نوفمبر",
  "Dec": "ديسمبر",
  "Squad Fit": "جاهزية الفريق",
  "Blue City": "بلو سيتي",
  "FC United": "إف سي يونايتد",
  "GOALIX Arena": "ملعب Goalix",
  "GOALIX Gym": "صالة Goalix",
  "HRV": "تباين نبض القلب",
  "OVR": "التقييم العام",
  "RW": "جناح أيمن",
  "CM": "وسط",
  "ST": "مهاجم",
  "GK": "حارس مرمى",
  "Maths": "الرياضيات",
  "Science": "العلوم",
  "PE": "التربية الرياضية",
  "Ctrl F": "بحث",
  "My Attendance": "حضوري",
  "Your attendance record": "سجل حضورك",
  "Attendance Rate": "معدل الحضور",
  "Attendance History": "سجل الحضور",
  "No attendance records yet": "لا توجد سجلات حضور بعد",
  "Breakdown": "التفصيل",
  "Total Sessions": "إجمالي الحصص",
  "Upcoming sessions for": "الحصص القادمة لـ",
  "your child": "طفلك",
  "Main Field": "الملعب الرئيسي",
  "No upcoming sessions": "لا توجد حصص قادمة",
  "No upcoming sessions.": "لا توجد حصص قادمة.",
  "session": "حصة",
  "sessions": "حصص",
  "Training, matches, and academy events for your group.": "التدريبات والمباريات وأحداث الأكاديمية الخاصة بمجموعتك.",
  "Loading calendar...": "جاري تحميل التقويم...",
  "No calendar events yet.": "لا توجد أحداث في التقويم بعد.",
  "Calendar events": "أحداث التقويم",
  "Event": "الحدث",
  "Events": "الأحداث",
  "Starts": "يبدأ",
  "Ends": "ينتهي",
  "All Day": "طوال اليوم",
  "Custom Data": "البيانات المخصصة",
  "Delete Field?": "حذف الحقل؟",
  "Delete Field And Values": "حذف الحقل والقيم",
  "Football Information": "معلومات كرة القدم",
  "Specific Coach": "مدرب محدد",
  "Select coach": "اختر مدربًا",
  "Select category": "اختر فئة",
  "Add Category": "إضافة فئة",
  "Field": "الحقل",
  "Fields": "الحقول",
  "Field Label": "عنوان الحقل",
  "Main Position": "المركز الأساسي",
  "Field Key": "مفتاح الحقل",
  "Field Type": "نوع الحقل",
  "Add Field": "إضافة حقل",
  "Select Field": "اختر الحقل",
  "Field with options": "حقل بخيارات",
  "Create a Single Select or Multi Select field first, then add options here.": "أنشئ حقل اختيار فردي أو متعدد أولًا، ثم أضف الخيارات هنا.",
  "Single Select": "اختيار فردي",
  "Multi Select": "اختيار متعدد",
  "Text": "نص",
  "Number": "رقم",
  "Boolean": "نعم / لا",
  "Required": "مطلوب",
  "Is Required": "مطلوب",
  "Option": "خيار",
  "Options": "الخيارات",
  "Add Option": "إضافة خيار",
  "Loading custom data...": "جاري تحميل البيانات المخصصة...",
  "Striker": "مهاجم",
  "Assign Coach": "تعيين مدرب",
  "Coach Access": "صلاحيات المدرب",
  "Assign coach access by branch, groups, birth years, or both.": "عيّن صلاحيات المدرب حسب الفرع أو المجموعات أو سنوات الميلاد أو الاثنين.",
  "Select Coach": "اختر المدرب",
  "Choose a coach...": "اختر مدربًا...",
  "Select Branch": "اختر الفرع",
  "Choose a branch...": "اختر فرعًا...",
  "Assignment Role": "دور التكليف",
  "Groups Access": "صلاحيات المجموعات",
  "Choose all or selected groups.": "اختر كل المجموعات أو مجموعات محددة.",
  "Birthdays Access": "صلاحيات سنوات الميلاد",
  "Choose all or selected birth years.": "اختر كل سنوات الميلاد أو سنوات محددة.",
  "Groups in branch": "المجموعات في الفرع",
  "Birthdays in branch": "سنوات الميلاد في الفرع",
  "All groups selected": "كل المجموعات محددة",
  "All birthdays selected": "كل سنوات الميلاد محددة",
  "Search groups...": "ابحث في المجموعات...",
  "Search birthdays...": "ابحث في سنوات الميلاد...",
  "Loading groups...": "جاري تحميل المجموعات...",
  "Loading birthdays...": "جاري تحميل سنوات الميلاد...",
  "No groups found for this branch.": "لا توجد مجموعات لهذا الفرع.",
  "No birthdays found for this branch.": "لا توجد سنوات ميلاد لهذا الفرع.",
  "Saving...": "جاري الحفظ...",
  "Update Assignment": "تحديث التكليف",
  "Assigned Coaches": "المدربون المعيّنون",
  "Search assigned coaches...": "ابحث في المدربين المعيّنين...",
  "No assigned coaches found.": "لا يوجد مدربون معيّنون.",
  "Loading current access...": "جاري تحميل الصلاحيات الحالية...",
  "Access": "الصلاحيات",
  "Assigned": "المعيّن",
  "selected": "محدد",
  "Project": "المشروع",
  "Projects": "المشاريع",
  "Total Projects": "إجمالي المشاريع",
  "Ended Projects": "المشاريع المنتهية",
  "Running Projects": "المشاريع الجارية",
  "Pending Project": "مشروع قيد الانتظار",
  "Ended": "منتهي",
  "Running": "قيد التنفيذ",
  "Discuss": "قيد النقاش",
  "On Discuss": "قيد النقاش",
  "In Progress": "قيد التنفيذ",
  "Increased from last month": "زيادة عن الشهر الماضي",
  "Increased from last month.": "زيادة عن الشهر الماضي.",
  "Task": "المهمة",
  "Tasks": "المهام",
  "Reminder": "تذكير",
  "Reminders": "التذكيرات",
  "Analytics": "التحليلات",
  "Team": "الفريق",
  "Import Data": "استيراد البيانات",
  "Add Project": "إضافة مشروع",
  "Start Meeting": "بدء الاجتماع",
  "Time Tracker": "متتبع الوقت",
  "Onboarding": "التهيئة",
  "Output": "المخرجات",
  "Employee": "الموظف",
  "Hirings": "التعيينات",
  "Download": "تحميل",
  "Download our Mobile App": "تحميل تطبيق الهاتف",
  "Mobile App": "تطبيق الهاتف",
  "Welcome": "مرحبًا",
  "Welcome in": "مرحبًا بك",
  "Goals": "الأهداف",
  "Assists": "التمريرات الحاسمة",
  "Minutes Played": "دقائق اللعب",
  "Shots on Target": "تسديدات على المرمى",
  "Pass Completion": "دقة التمرير",
  "Key Passes": "تمريرات مفتاحية",
  "Sleep": "النوم",
  "Fatigue": "الإجهاد",
  "Energy": "الطاقة",
  "Mood": "الحالة المزاجية",
  "Soreness": "الإجهاد العضلي",
  "Positive": "إيجابي",
  "Speed Training": "تدريب السرعة",
  "Technical Drills": "تدريبات فنية",
  "Strength Training": "تدريب القوة",
  "Tactical Session": "حصة تكتيكية",
  "Rest Day": "يوم راحة",
  "Performance Trend": "اتجاه الأداء",
  "Heatmap": "الخريطة الحرارية",
  "Key Stats": "إحصائيات رئيسية",
  "Coach Feedback": "ملاحظات المدرب",
  "Great intensity and movement. Your decision making in the final third is improving.": "شدة وحركة ممتازة. قراراتك في الثلث الأخير تتحسن.",
  "Wellness": "العافية",
  "Weekly Training Schedule": "جدول التدريب الأسبوعي",
  "Season Highlights": "أبرز لقطات الموسم",
  "Avg Rating": "متوسط التقييم",
  "Achievements": "الإنجازات",
  "Player of the Match": "لاعب المباراة",
  "Top Performer": "أفضل أداء",
  "Consistency Streak": "سلسلة الثبات",
  "Next Milestone": "الهدف التالي",
  "Goal Contribution": "المساهمة التهديفية",
  "2 more to unlock": "تبقى 2 للفتح",
  "Weather": "الطقس",
  "Focus Area": "منطقة التركيز",
  "Final Third": "الثلث الأخير",
  "Riverside Stadium": "ملعب ريفرسايد",
  "Saturday": "السبت",
  "Win": "فوز",
  "Loss": "خسارة",
  "Draw": "تعادل",
  "Participation": "المشاركة",
  "Overall Progress": "التقدم العام",
  "On Track": "على المسار",
  "Training Participation": "المشاركة في التدريب",
  "On-Time Rate": "نسبة الالتزام بالوقت",
  "Session Rating": "تقييم الحصة",
  "Safety Status": "حالة السلامة",
  "Alerts": "التنبيهات",
  "View All": "عرض الكل",
  "Training time change": "تغيير وقت التدريب",
  "Bring: Shin guards": "أحضر: واقيات الساق",
  "Equipment Reminder": "تذكير بالمعدات",
  "Match day": "يوم المباراة",
  "unread alerts": "تنبيهات غير مقروءة",
  "Skill Development": "تطوير المهارات",
  "Finishing": "إنهاء الهجمات",
  "Passing": "التمرير",
  "Dribbling": "المراوغة",
  "Defending": "الدفاع",
  "Game IQ": "ذكاء اللعب",
  "Performance Heatmap": "الخريطة الحرارية للأداء",
  "Attacking Direction": "اتجاه الهجوم",
  "Coach Notes": "ملاحظات المدرب",
  "Coach Alex": "المدرب أليكس",
  "Noah has shown great improvement in movement off the ball and finishing in training.": "أظهر نوح تحسنًا كبيرًا في الحركة بدون كرة وإنهاء الهجمات في التدريب.",
  "Hard Worker": "مجتهد",
  "Team Player": "لاعب جماعي",
  "Wellness Summary": "ملخص العافية",
  "Upcoming Sessions": "الحصص القادمة",
  "View Full Schedule": "عرض الجدول الكامل",
  "Technical Training": "تدريب فني",
  "Strength & Conditioning": "القوة والتأهيل",
  "Match Day": "يوم المباراة",
  "Recent Match": "آخر مباراة",
  "Academic Progress": "التقدم الدراسي",
  "Overall Average": "المتوسط العام",
  "English": "الإنجليزية",
  "Communication": "التواصل",
  "Team Group": "مجموعة الفريق",
  "Direct Message": "رسالة مباشرة",
  "Great session everyone!": "حصة ممتازة للجميع!",
  "Let's chat about Noah's progress.": "لنتحدث عن تقدم نوح.",
  "Documents & Forms": "المستندات والنماذج",
  "Medical Consent Form": "نموذج الموافقة الطبية",
  "Code of Conduct": "مدونة السلوك",
  "Photo & Video Consent": "موافقة الصور والفيديو",
  "Accepted": "مقبول",
  "Current Plan": "الخطة الحالية",
  "Next Payment": "الدفعة القادمة",
  "Auto-pay ON": "الدفع التلقائي مفعل",
  "Family Access": "وصول العائلة",
  "Mother": "الأم",
  "Father": "الأب",
  "Primary Contact": "جهة الاتصال الأساسية",
  "Full Access": "وصول كامل",
  "View Access": "عرض فقط",
  "Invite Family Member": "دعوة فرد من العائلة",
  "Coach performance hub": "مركز أداء المدرب",
  "Here is your team performance overview for today.": "هذه نظرة عامة على أداء فريقك اليوم.",
  "U13 Elite Group": "مجموعة U13 النخبة",
  "Review last match": "مراجعة آخر مباراة",
  "Recovery": "استشفاء",
  "Tactical": "تكتيكي",
  "Intensity": "الشدة",
  "Set Pieces": "كرات ثابتة",
  "Match Prep": "تحضير المباراة",
  "Physical Load": "الحمل البدني",
  "Chronic Load": "الحمل المزمن",
  "High Speed": "سرعة عالية",
  "Group Overview": "نظرة على المجموعات",
  "Coach Impact": "تأثير المدرب",
  "Coach Actions": "إجراءات المدرب",
  "View plan": "عرض الخطة",
  "Focus Players": "لاعبون تحت التركيز",
  "Lineup Review": "مراجعة التشكيل",
  "Mark Attendance": "تسجيل الحضور",
  "Video Analysis": "تحليل الفيديو",
  "Injury Follow-up": "متابعة الإصابة",
  "Opposition Report": "تقرير المنافس",
  "Squad prepared": "الفريق جاهز",
  "Training target": "هدف التدريب",
  "Per 90": "لكل 90 دقيقة",
  "Controlled phases": "مراحل السيطرة",
  "Availability": "الإتاحة",
  "Team Rating": "تقييم الفريق",
  "Win Rate": "نسبة الفوز",
  "Team High": "أعلى رقم في الفريق",
  "Team Avg": "متوسط الفريق",
  "City Rovers": "سيتي روفرز",
  "Away Match": "مباراة خارج الأرض",
  "Home Match": "مباراة على الأرض",
  "Winger": "جناح",
  "Age": "العمر",
  "Height": "الطول",
  "Weight": "الوزن",
  "Foot": "القدم",
  "Left": "يسار",
  "Right": "يمين",
  "DOB": "تاريخ الميلاد",
  "View Full Profile": "عرض الملف الكامل",
  "Mon": "الإثنين",
  "Tue": "الثلاثاء",
  "Wed": "الأربعاء",
  "Thu": "الخميس",
  "Fri": "الجمعة",
  "Sat": "السبت",
  "Sun": "الأحد",
  "Welcome, Player": "أهلا، اللاعب",
  "Welcome, Coach": "أهلا، المدرب",
  "Welcome, Parent": "أهلا، ولي الأمر",
  "Welcome, Admin": "أهلا، المدير",
  "Live training, matches, groups, and player data from the backend.": "بيانات مباشرة للتدريبات والمباريات والمجموعات واللاعبين من الباك اند.",
  "Some coach dashboard data could not load. Check backend login/session and API availability.": "تعذر تحميل بعض بيانات لوحة المدرب. تأكد من تسجيل الدخول وتوفر الـ API.",
  "Loading coach dashboard from backend...": "جاري تحميل لوحة المدرب من الباك اند...",
  "Some player data could not load. Anything available from the backend is still shown below.": "تعذر تحميل بعض بيانات اللاعب. سيتم عرض أي بيانات متاحة من الباك اند بالأسفل.",
  "Loading your player dashboard...": "جاري تحميل لوحة اللاعب...",
  "Loading your training data...": "جاري تحميل بيانات التدريب...",
  "Your live academy data, upcoming schedule, match plan, and coach feedback.": "بياناتك المباشرة في الأكاديمية، جدولك القادم، خطة المباريات، وملاحظات المدرب.",
  "Your upcoming sessions, training plans, attendance, and coach evaluations.": "حصصك القادمة، خطط التدريب، الحضور، وتقييمات المدرب.",
  "Open Trainings": "تدريبات مفتوحة",
  "Scheduled sessions": "حصص مجدولة",
  "Completed Trainings": "تدريبات مكتملة",
  "Recorded sessions": "حصص مسجلة",
  "Completed Matches": "مباريات مكتملة",
  "With match history": "مع سجل المباريات",
  "Squad Ready": "الفريق جاهز",
  "Completed profiles": "ملفات مكتملة",
  "Permissions": "الصلاحيات",
  "Evaluation groups": "مجموعات التقييم",
  "Upcoming Training": "التدريب القادم",
  "Next Agenda": "الأجندة القادمة",
  "Assigned Groups": "المجموعات المعينة",
  "Training Attendance": "حضور التدريب",
  "Evaluate assigned players": "تقييم اللاعبين المعينين",
  "Match Configuration": "إعدادات المباراة",
  "No backend training sessions are assigned to you yet.": "لا توجد حصص تدريب من الباك اند معينة لك حتى الآن.",
  "No backend matches are assigned to you yet.": "لا توجد مباريات من الباك اند معينة لك حتى الآن.",
  "No upcoming training or match agenda from backend yet.": "لا توجد أجندة تدريب أو مباريات قادمة من الباك اند حتى الآن.",
  "No backend players are assigned to you yet.": "لا يوجد لاعبون من الباك اند معينون لك حتى الآن.",
  "No backend groups are assigned to your coach account yet.": "لا توجد مجموعات من الباك اند معينة لحساب المدرب حتى الآن.",
  "No target groups": "لا توجد مجموعات مستهدفة",
  "No position": "لا يوجد مركز",
  "No groups assigned yet.": "لا توجد مجموعات معينة حتى الآن.",
  "Player Measurements": "قياسات اللاعبين",
  "Record physical measurements for your players": "سجل القياسات البدنية للاعبيك",
  "Could not load your groups.": "تعذر تحميل مجموعاتك.",
  "Select group": "اختر مجموعة",
  "Loading players...": "جاري تحميل اللاعبين...",
  "Latest": "الأحدث",
  "Optional": "اختياري",
  "Could not save measurements. Please check the values.": "تعذر حفظ القياسات. تأكد من القيم.",
  "Saved": "تم الحفظ",
  "Save Measurements": "حفظ القياسات",
  "Matches Played": "المباريات الملعوبة",
  "Weekly Minutes": "دقائق الأسبوع",
  "Goals / Assists": "الأهداف / التمريرات الحاسمة",
  "Player Snapshot": "لمحة اللاعب",
  "Latest Coach Feedback": "آخر ملاحظات المدرب",
  "Latest training evaluation": "آخر تقييم تدريبي",
  "Ball work and execution": "العمل بالكرة والتنفيذ",
  "Fitness and intensity": "اللياقة والشدة",
  "Strengths": "نقاط القوة",
  "Weaknesses": "نقاط الضعف",
  "Improvement Plan": "خطة التحسين",
  "Coach notes": "ملاحظات المدرب",
  "No coach evaluation is available yet.": "لا يوجد تقييم من المدرب حتى الآن.",
  "No upcoming match has been scheduled for your group yet.": "لم يتم جدولة مباراة قادمة لمجموعتك حتى الآن.",
  "No upcoming training or calendar events are listed yet.": "لا توجد تدريبات أو أحداث قادمة في التقويم حتى الآن.",
  "No completed matches with your data yet.": "لا توجد مباريات مكتملة ببياناتك حتى الآن.",
  "Position": "المركز",
  "Rating": "التقييم",
  "Minutes": "الدقائق",
  "Latest Overall": "آخر تقييم عام",
  "Latest Status": "آخر حالة",
  "No attendance yet": "لا يوجد حضور حتى الآن",
  "Upcoming Training Plans": "خطط التدريب القادمة",
  "Focus": "التركيز",
  "Objectives": "الأهداف",
  "Session Plan": "خطة الحصة",
  "Equipment": "المعدات",
  "Latest Training Evaluation": "آخر تقييم تدريبي",
  "No player-visible training evaluation has been published yet.": "لم يتم نشر تقييم تدريبي ظاهر للاعب حتى الآن.",
  "Recent Training History": "سجل التدريب الأخير",
  "All Published Evaluations": "كل التقييمات المنشورة",
  "No upcoming training is visible for you yet.": "لا يوجد تدريب قادم ظاهر لك حتى الآن.",
  "No completed training sessions yet.": "لا توجد حصص تدريب مكتملة حتى الآن.",
  "No evaluations have been published yet.": "لم يتم نشر أي تقييمات حتى الآن.",
  "Training evaluation": "تقييم تدريبي",
  "Coach Evaluation": "تقييم المدرب",
  "Mentality": "العقلية",
  "Discipline": "الانضباط",
  "Teamwork": "العمل الجماعي",
  "Impact": "التأثير",
  "Ball Control": "التحكم بالكرة",
  "Passing Accuracy": "دقة التمرير",
  "Shooting": "التسديد",
  "Receiving Under Pressure": "الاستلام تحت الضغط",
  "Speed": "السرعة",
  "Endurance": "التحمل",
  "Strength": "القوة",
  "Agility": "الرشاقة",
  "trainings attended": "تدريبات تم حضورها",
  "attended records": "سجلات حضور",
  "match entries this week": "مشاركات مباريات هذا الأسبوع",
  "From recorded match stats": "من إحصائيات المباريات المسجلة",
  "assigned players": "لاعبين معينين",
  "upcoming matches": "مباريات قادمة",
  "scheduled sessions": "حصص مجدولة",
  "Administrator": "المدير",
  "Not set": "غير محدد",
  "TBD": "لم يحدد بعد",
  "N/A": "غير متاح",
  "present": "حاضر",
  "completed": "مكتمل",
  "finished": "منتهي",
  "starter": "أساسي",
  "scheduled": "مجدول",
  "substitute": "بديل",
  "reserve": "احتياطي",
  "postponed": "مؤجل",
  "late": "متأخر",
  "excused": "بعذر",
  "cancelled": "ملغي",
  "absent": "غائب",
  "injured": "مصاب",
  "complete": "مكتمل",
  "incomplete": "غير مكتمل",
};

type NavItem = {
  label: string;
  href?: string;
  icon?: string;
  children?: { label: string; href: string }[];
};

const adminNavPermissions: Record<string, string[]> = {
  "/admin/dashboard": ["access_admin_dashboard", "admin.dashboard.access"],
  "/admin/chat": ["access_admin_dashboard", "admin.dashboard.access"],
  "/admin/requests": ["manage_users", "admin.user.update"],
  "/admin/academy/branches": ["manage_teams", "admin.group.manage"],
  "/admin/academy/birth-years": ["manage_teams", "admin.group.manage"],
  "/admin/academy/groups": ["manage_teams", "admin.group.manage"],
  "/admin/coaches": ["manage_coaches", "coach.read.academy", "coach.read.branch"],
  "/admin/coaches/assign": ["manage_coaches", "coach.update"],
  "/admin/coaches/assignments": ["manage_coaches", "coach.update"],
  "/admin/players": ["manage_players", "player.read.academy", "player.read.branch"],
  "/admin/calendar": ["manage_schedules", "calendar.manage.academy"],
  "/admin/matches": ["manage_schedules", "calendar.manage.academy", "ranking.read.academy"],
  "/admin/matches/archive": ["manage_schedules", "calendar.manage.academy", "ranking.read.academy"],
  "/admin/registrations": ["manage_users", "admin.user.create", "admin.user.update"],
  "/admin/attendance": ["manage_attendance", "attendance.view.academy", "attendance.export"],
  "/admin/rankings/weekly": ["rankings:read", "ranking.read.academy", "ranking.read.branch"],
  "/admin/rankings/monthly": ["rankings:read", "ranking.read.academy", "ranking.read.branch"],
  "/admin/payments": ["view_financial_reports", "payment.read.academy"],
  "/admin/payments/subscriptions": ["manage_subscriptions", "payment.read.academy"],
  "/admin/payments/invoices": ["manage_payments", "payment.read.academy"],
  "/admin/payments/reports": ["view_financial_reports", "payment.export", "payment.read.academy"],
  "/admin/notifications": ["access_admin_dashboard", "admin.dashboard.access"],
  "/admin/notifications/compose": ["access_admin_dashboard", "admin.dashboard.access"],
  "/admin/reports/s": ["view_financial_reports", "payment.export", "attendance.export"],
  "/admin/reports/player-progress": ["manage_players", "player.read.academy", "ranking.read.academy"],
  "/admin/reports/attendance": ["manage_attendance", "attendance.export", "attendance.view.academy"],
  "/admin/reports/coach": ["manage_coaches", "coach.read.academy"],
  "/admin/settings": ["manage_academy_settings", "admin.settings.update"],
  "/admin/settings/player-options": ["manage_players", "player.update"],
  "/admin/settings/roles": ["manage_roles", "manage_permissions", "admin.role.manage"],
  "/admin/settings/integrations": ["manage_academy_settings", "admin.settings.update"],
};

const hasAnyPermission = (
  granted: Set<string>,
  required: string[] | undefined,
) => !required?.length || required.some((permission) => granted.has(permission));

function filterAdminNav(items: NavItem[], granted: Set<string>) {
  return items
    .map((item) => {
      const children = item.children?.filter((child) =>
        hasAnyPermission(granted, adminNavPermissions[child.href]),
      );
      return children ? { ...item, children } : item;
    })
    .filter((item) => {
      if (item.children) return item.children.length > 0;
      return hasAnyPermission(
        granted,
        item.href ? adminNavPermissions[item.href] : undefined,
      );
    });
}

function firstNavHref(items: NavItem[]) {
  for (const item of items) {
    if (item.href) return item.href;
    const childHref = item.children?.find((child) => child.href)?.href;
    if (childHref) return childHref;
  }
  return null;
}

function requiredAdminPermissions(pathname: string): string[] | null {
  const match = Object.entries(adminNavPermissions)
    .filter(([href]) => pathname === href || pathname.startsWith(`${href}/`))
    .sort(([left], [right]) => right.length - left.length)[0];
  return match?.[1] ?? null;
}

const coachNavPermissions: Record<string, CoachPermission> = {
  "/coach/training/create": "can_create_training",
  "/coach/measurements": "can_record_measurements",
  "/coach/injury-risk-ai": "can_view_injury_risk",
  "/coach/matches/evaluation": "can_evaluate_players",
  "/coach/matches/configuration": "can_manage_matches",
  "/coach/player-options": "can_manage_groups",
};

function filterCoachNav(
  items: NavItem[],
  canUse: (permission: CoachPermission) => boolean,
) {
  return items
    .map((item) => {
      const children = item.children?.filter((child) => {
        const permission = coachNavPermissions[child.href];
        return !permission || canUse(permission);
      });
      return children ? { ...item, children } : item;
    })
    .filter((item) => {
      if (item.children) return item.children.length > 0;
      const permission = item.href ? coachNavPermissions[item.href] : undefined;
      return !permission || canUse(permission);
    });
}

function requiredCoachPermission(pathname: string): CoachPermission | null {
  const match = Object.entries(coachNavPermissions)
    .filter(([href]) => pathname === href || pathname.startsWith(`${href}/`))
    .sort(([left], [right]) => right.length - left.length)[0];
  if (match) return match[1];
  if (pathname.startsWith("/coach/evaluations")) return "can_evaluate_players";
  return null;
}

function firstHref(item: NavItem) {
  return item.href ?? item.children?.[0]?.href ?? "#";
}

function isActive(pathname: string, item: NavItem) {
  if (item.href && (pathname === item.href || pathname.startsWith(`${item.href}/`))) return true;
  return Boolean(item.children?.some((child) => pathname === child.href || pathname.startsWith(`${child.href}/`)));
}

function shouldSkipDomTranslation(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return true;
  if (/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(trimmed)) return true;
  if (/^(https?:|mailto:|tel:|data:|blob:)/i.test(trimmed)) return true;
  if (/^[\d\s.,:+\-/%#()]+$/.test(trimmed)) return true;
  return false;
}

function translateDynamicLabel(label: string, language: DashboardLanguage): string | null {
  if (language !== "ar") return null;

  const welcomeMatch = label.match(/^Welcome,\s*(.+)$/i);
  if (welcomeMatch) return `أهلا، ${translate(welcomeMatch[1], language)}`;

  const doneMatch = label.match(/^(.+)\sDone$/i);
  if (doneMatch) return `${translate(doneMatch[1], language)} ${arCopy.Done}`;

  const fractionDoneMatch = label.match(/^(\d+\s*\/\s*\d+)\sDone$/i);
  if (fractionDoneMatch) return `${fractionDoneMatch[1]} ${arCopy.Done}`;

  const rankingsInMatch = label.match(/^Rankings in\s+(.+)$/i);
  if (rankingsInMatch) return `الترتيب داخل ${translate(rankingsInMatch[1], language)}`;

  const rankedMatchesMatch = label.match(/^(\d+)\s+(?:ranked\s+matches?|matches?\s+ranked)$/i);
  if (rankedMatchesMatch) {
    const count = Number(rankedMatchesMatch[1]);
    return count === 1 ? "مباراة واحدة في الترتيب" : `${rankedMatchesMatch[1]} مباريات في الترتيب`;
  }

  const recordsCountMatch = label.match(/^(\d+)\s+records?$/i);
  if (recordsCountMatch) {
    const count = Number(recordsCountMatch[1]);
    return count === 1 ? "سجل واحد" : `${recordsCountMatch[1]} سجلات`;
  }

  const trainingRecordsMatch = label.match(/^(\d+)\s+training records?$/i);
  if (trainingRecordsMatch) {
    const count = Number(trainingRecordsMatch[1]);
    return count === 1 ? "سجل تدريب واحد" : `${trainingRecordsMatch[1]} سجلات تدريب`;
  }

  const matchRecordsMatch = label.match(/^(\d+)\s+match records?$/i);
  if (matchRecordsMatch) {
    const count = Number(matchRecordsMatch[1]);
    return count === 1 ? "سجل مباراة واحد" : `${matchRecordsMatch[1]} سجلات مباريات`;
  }

  const recordedSessionsAttendedMatch = label.match(/^(\d+)\s*\/\s*(\d+)\s+recorded sessions attended$/i);
  if (recordedSessionsAttendedMatch) return `${recordedSessionsAttendedMatch[1]}/${recordedSessionsAttendedMatch[2]} حصص مسجلة تم حضورها`;

  const showingDatabaseRecordsMatch = label.match(/^Showing\s+(\d+)\s+of\s+(\d+)\s+database records$/i);
  if (showingDatabaseRecordsMatch) return `يعرض ${showingDatabaseRecordsMatch[1]} من ${showingDatabaseRecordsMatch[2]} سجلات قاعدة البيانات`;

  const subscriptionsCountMatch = label.match(/^(\d+)\s+subscriptions?$/i);
  if (subscriptionsCountMatch) {
    const count = Number(subscriptionsCountMatch[1]);
    return count === 1 ? "اشتراك واحد" : `${subscriptionsCountMatch[1]} اشتراكات`;
  }

  const sessionCountMatch = label.match(/^(\d+)\s+sessions?$/i);
  if (sessionCountMatch) return `${sessionCountMatch[1]} ${Number(sessionCountMatch[1]) === 1 ? "حصة" : "حصص"}`;

  const attendedSessionsMatch = label.match(/^(\d+)\s*\/\s*(\d+)\s+sessions?\s+attended$/i);
  if (attendedSessionsMatch) return `${attendedSessionsMatch[1]}/${attendedSessionsMatch[2]} حصص تم حضورها`;

  const countedPhraseMatch = label.match(/^(\d+)\s+(.+)$/i);
  if (countedPhraseMatch) return `${countedPhraseMatch[1]} ${translate(countedPhraseMatch[2], language)}`;

  const ratingBadgeMatch = label.match(/^(Overall|Fatigue)\s+(.+)$/i);
  if (ratingBadgeMatch) return `${translate(ratingBadgeMatch[1], language)} ${ratingBadgeMatch[2]}`;

  const upcomingSessionsMatch = label.match(/^Upcoming sessions for\s+(.+)$/i);
  if (upcomingSessionsMatch) return `الحصص القادمة لـ ${translate(upcomingSessionsMatch[1], language)}`;

  const selectedMatch = label.match(/^(\d+)\s+selected$/i);
  if (selectedMatch) return `${selectedMatch[1]} محدد`;

  const groupsInMatch = label.match(/^Groups in\s+(.+)$/i);
  if (groupsInMatch) return `المجموعات في ${translate(groupsInMatch[1], language)}`;

  const birthdaysInMatch = label.match(/^Birthdays in\s+(.+)$/i);
  if (birthdaysInMatch) return `سنوات الميلاد في ${translate(birthdaysInMatch[1], language)}`;

  const loadingMatch = label.match(/^Loading\s+(.+?)\.\.\.$/i);
  if (loadingMatch) return `جاري تحميل ${translate(loadingMatch[1], language)}...`;

  const searchMatch = label.match(/^Search\s+(.+?)\.\.\.$/i);
  if (searchMatch) return `ابحث في ${translate(searchMatch[1], language)}...`;

  const chooseMatch = label.match(/^Choose\s+(.+?)\.\.\.$/i);
  if (chooseMatch) return `اختر ${translate(chooseMatch[1], language)}...`;

  const noFoundMatch = label.match(/^No\s+(.+?)\s+found(?:\s+for\s+(.+?))?\.?$/i);
  if (noFoundMatch) {
    const subject = translate(noFoundMatch[1], language);
    const scope = noFoundMatch[2] ? ` في ${translate(noFoundMatch[2], language)}` : "";
    return `لا توجد ${subject}${scope}.`;
  }

  const dueDateMatch = label.match(/^Due date:\s*(.+)$/i);
  if (dueDateMatch) return `تاريخ الاستحقاق: ${translate(dueDateMatch[1], language)}`;

  const onMatch = label.match(/^On\s+(.+)$/i);
  if (onMatch) return `على ${translate(onMatch[1], language)}`;

  return null;
}

function translate(label: string, language: DashboardLanguage): string {
  if (language !== "ar") return label;
  const normalizedLabel = label.replace(/\u00a0/g, " ").replace(/[’]/g, "'").trim();
  if (arCopy[normalizedLabel]) return arCopy[normalizedLabel];
  if (fallbackArTerms[normalizedLabel]) return fallbackArTerms[normalizedLabel];

  const dynamicTranslation = translateDynamicLabel(normalizedLabel, language);
  if (dynamicTranslation) return dynamicTranslation;

  const pipeParts = normalizedLabel.split("|");
  if (pipeParts.length > 1) {
    return pipeParts.map((part) => translate(part, language)).join(" | ");
  }

  let next = normalizedLabel;
  const terms = Object.entries({ ...fallbackArTerms, ...arCopy }).sort((a, b) => b[0].length - a[0].length);

  for (const [source, target] of terms) {
    if (!source || source.length < 3 || source === target) continue;
    const escaped = source.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const hasOnlyAsciiWords = /^[A-Za-z0-9 ]+$/.test(source);
    const pattern = hasOnlyAsciiWords
      ? new RegExp(`(^|[^A-Za-z0-9])(${escaped})(?=$|[^A-Za-z0-9])`, "gi")
      : new RegExp(escaped, "gi");
    next = next.replace(pattern, (...args) => {
      const leading = hasOnlyAsciiWords ? args[1] : "";
      return `${leading}${target}`;
    });
  }

  return next;
}

function ParentChildSwitcher({ t }: { t: (label: string) => string }) {
  const { children, selectedChildId, setSelectedChildId, isLoading } =
    useParentSelectedChild();

  if (isLoading || children.length <= 1) return null;

  return (
    <label className="goalix-parent-child-switcher">
      <Baby size={15} />
      <select
        aria-label={t("Switch child")}
        value={selectedChildId}
        onChange={(event) => setSelectedChildId(event.target.value)}
      >
        {children.map((child) => (
          <option key={child.id} value={child.id}>
            {child.full_name}
          </option>
        ))}
      </select>
    </label>
  );
}

export function DashboardFrame({
  role,
  children,
}: {
  role: UserRole;
  children: React.ReactNode;
}) {
  useRealtimeNotifications();
  const pathname = usePathname();
  const router = useRouter();
  const authState = useCurrentUser();
  const { user } = authState;
  const { logout } = useAuth();
  const contentRef = useRef<HTMLDivElement>(null);
  const messageMenuRef = useRef<HTMLDivElement>(null);
  const {
    can: coachCan,
    isLoading: coachPermissionsLoading,
    isFetching: coachPermissionsFetching,
  } = useCoachPermissions({
    skip: role !== "coach" || !authState.isAuthenticated,
  });
  const {
    data: currentPermissions,
    isLoading: adminPermissionsLoading,
    isFetching: adminPermissionsFetching,
  } = useGetCurrentPermissionsQuery(user?.id, {
    skip: role !== "admin" || !authState.isAuthenticated,
    refetchOnMountOrArgChange: true,
  });
  const adminPermissionSet = useMemo(
    () => new Set(currentPermissions?.permissions ?? []),
    [currentPermissions?.permissions],
  );
  const nav = useMemo(() => {
    const items = NAV_ITEMS[role] as NavItem[];
    if (role === "admin") return filterAdminNav(items, adminPermissionSet);
    if (role !== "coach") return items;
    return filterCoachNav(items, coachCan);
  }, [adminPermissionSet, coachCan, role]);
  const hasSettingsInMainNav = useMemo(
    () =>
      nav.some((item) =>
        item.href === (settingsRoutes[role] ?? ROLE_ROUTES[role]) ||
        item.children?.some(
          (child) => child.href === (settingsRoutes[role] ?? ROLE_ROUTES[role]),
        ),
      ),
    [nav, role],
  );
  const firstAllowedHref = useMemo(() => firstNavHref(nav), [nav]);
  const adminPagePermissions =
    role === "admin" ? requiredAdminPermissions(pathname) : null;
  const pagePermission =
    role === "coach" ? requiredCoachPermission(pathname) : null;
  const pagePermissionLoading =
    (Boolean(pagePermission) &&
      (coachPermissionsLoading || coachPermissionsFetching)) ||
    (Boolean(adminPagePermissions) &&
      (adminPermissionsLoading || adminPermissionsFetching));
  const pagePermissionDenied =
    (Boolean(pagePermission) &&
    !pagePermissionLoading &&
      !coachCan(pagePermission as CoachPermission)) ||
    (Boolean(adminPagePermissions) &&
      !pagePermissionLoading &&
      !hasAnyPermission(adminPermissionSet, adminPagePermissions || undefined));

  useEffect(() => {
    if (
      role === "admin" &&
      pagePermissionDenied &&
      firstAllowedHref &&
      firstAllowedHref !== pathname
    ) {
      router.replace(firstAllowedHref);
    }
  }, [firstAllowedHref, pagePermissionDenied, pathname, role, router]);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});
  const [language, setLanguage] = useState<DashboardLanguage>("en");
  const [theme, setTheme] = useState<DashboardTheme>("light");
  const [density, setDensity] = useState<DashboardDensity>("comfortable");
  const [motion, setMotion] = useState<DashboardMotion>("full");
  const [focusMode, setFocusMode] = useState<DashboardFocus>("off");
  const [settingsReady, setSettingsReady] = useState(false);
  const [compactNav, setCompactNav] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [messageMenuOpen, setMessageMenuOpen] = useState(false);
  const { data: academy } = useGetAcademyQuery(undefined, {
    skip: !authState.isAuthenticated,
  });
  const academySettings = (academy?.settings ?? {}) as Record<string, unknown>;
  const communityWhatsappUrl =
    typeof academySettings.communityWhatsappUrl === "string"
      ? academySettings.communityWhatsappUrl
      : "";
  const communityWhatsappHref = getExternalHref(communityWhatsappUrl);

  const t = useMemo(() => (label: string) => translate(label, language), [language]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      const savedLanguage = window.localStorage.getItem("goalix-dashboard-language");
      const savedTheme = window.localStorage.getItem("goalix-dashboard-theme");
      const savedDensity = window.localStorage.getItem("goalix-dashboard-density");
      const savedMotion = window.localStorage.getItem("goalix-dashboard-motion");
      const savedFocus = window.localStorage.getItem("goalix-dashboard-focus");

      if (savedLanguage === "ar" || savedLanguage === "en") {
        setLanguage(savedLanguage);
      }

      if (savedTheme === "dark" || savedTheme === "light") {
        setTheme(savedTheme);
      }
      if (savedDensity === "comfortable" || savedDensity === "compact") {
        setDensity(savedDensity);
      }
      if (savedMotion === "full" || savedMotion === "reduced") {
        setMotion(savedMotion);
      }
      if (savedFocus === "off" || savedFocus === "on") {
        setFocusMode(savedFocus);
      }

      setSettingsReady(true);
    }, 0);

    return () => window.clearTimeout(timeout);
  }, []);

  useEffect(() => {
    const query = window.matchMedia("(max-width: 1180px)");
    const syncCompactNav = () => setCompactNav(query.matches);

    syncCompactNav();
    query.addEventListener("change", syncCompactNav);

    return () => query.removeEventListener("change", syncCompactNav);
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setMobileNavOpen(false);
      setMessageMenuOpen(false);
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [pathname]);

  useEffect(() => {
    if (!messageMenuOpen) return;

    const closeOnOutsideClick = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (target && messageMenuRef.current?.contains(target)) return;
      setMessageMenuOpen(false);
    };

    document.addEventListener("mousedown", closeOnOutsideClick);

    return () => document.removeEventListener("mousedown", closeOnOutsideClick);
  }, [messageMenuOpen]);

  useEffect(() => {
    if (!settingsReady) return;
    window.localStorage.setItem("goalix-dashboard-language", language);
    document.documentElement.dataset.goalixDashboardLanguage = language;
    document.documentElement.dir = language === "ar" ? "rtl" : "ltr";
    document.querySelector(".goalix-dashboard-viewport")?.setAttribute("data-dashboard-language", language);
  }, [language, settingsReady]);

  useEffect(() => {
    if (!settingsReady) return;
    window.localStorage.setItem("goalix-dashboard-theme", theme);
    document.documentElement.dataset.goalixDashboardTheme = theme;
    document.querySelector(".goalix-dashboard-viewport")?.setAttribute("data-dashboard-theme", theme);
  }, [theme, settingsReady]);

  useEffect(() => {
    if (!settingsReady) return;
    window.localStorage.setItem("goalix-dashboard-density", density);
    document.documentElement.dataset.goalixDashboardDensity = density;
    document.querySelector(".goalix-dashboard-viewport")?.setAttribute("data-dashboard-density", density);
  }, [density, settingsReady]);

  useEffect(() => {
    if (!settingsReady) return;
    window.localStorage.setItem("goalix-dashboard-motion", motion);
    document.documentElement.dataset.goalixDashboardMotion = motion;
    document.querySelector(".goalix-dashboard-viewport")?.setAttribute("data-dashboard-motion", motion);
  }, [motion, settingsReady]);

  useEffect(() => {
    if (!settingsReady) return;
    window.localStorage.setItem("goalix-dashboard-focus", focusMode);
    document.documentElement.dataset.goalixDashboardFocus = focusMode;
    document.querySelector(".goalix-dashboard-viewport")?.setAttribute("data-dashboard-focus", focusMode);
  }, [focusMode, settingsReady]);

  useEffect(() => {
    const syncSettings = (event?: Event) => {
      const detail =
        event instanceof CustomEvent
          ? (event.detail as {
              language?: DashboardLanguage;
              theme?: DashboardTheme;
              density?: DashboardDensity;
              motion?: DashboardMotion;
              focusMode?: DashboardFocus;
            })
          : {};
      const savedLanguage =
        detail.language ?? window.localStorage.getItem("goalix-dashboard-language");
      const savedTheme =
        detail.theme ?? window.localStorage.getItem("goalix-dashboard-theme");
      const savedDensity =
        detail.density ?? window.localStorage.getItem("goalix-dashboard-density");
      const savedMotion =
        detail.motion ?? window.localStorage.getItem("goalix-dashboard-motion");
      const savedFocus =
        detail.focusMode ?? window.localStorage.getItem("goalix-dashboard-focus");

      if (savedLanguage === "ar" || savedLanguage === "en") {
        setLanguage(savedLanguage);
      }
      if (savedTheme === "dark" || savedTheme === "light") {
        setTheme(savedTheme);
      }
      if (savedDensity === "comfortable" || savedDensity === "compact") {
        setDensity(savedDensity);
      }
      if (savedMotion === "full" || savedMotion === "reduced") {
        setMotion(savedMotion);
      }
      if (savedFocus === "off" || savedFocus === "on") {
        setFocusMode(savedFocus);
      }
    };

    const syncFromStorage = () => syncSettings();

    window.addEventListener("goalix-dashboard-settings-changed", syncSettings);
    window.addEventListener("storage", syncFromStorage);

    return () => {
      window.removeEventListener("goalix-dashboard-settings-changed", syncSettings);
      window.removeEventListener("storage", syncFromStorage);
    };
  }, []);

  useEffect(() => {
    const translateRoot = (root: HTMLElement) => {
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      const nodes: Text[] = [];

      while (walker.nextNode()) {
        nodes.push(walker.currentNode as Text);
      }

      for (const node of nodes) {
        const parent = node.parentElement;
        const currentText = node.textContent ?? "";
        const trimmed = currentText.trim();

        if (!parent || !trimmed || parent.closest("script, style, input, textarea")) continue;
        if (shouldSkipDomTranslation(trimmed)) continue;

        const textNode = node as Text & { goalixOriginalText?: string };
        const savedOriginal = textNode.goalixOriginalText;
        const savedTranslation = savedOriginal ? translate(savedOriginal, language).trim() : "";
        const currentLooksTranslated = /[\u0600-\u06FF]/.test(trimmed);
        const original =
          !savedOriginal || (trimmed !== savedOriginal && trimmed !== savedTranslation && !currentLooksTranslated)
            ? trimmed
            : savedOriginal;
        textNode.goalixOriginalText = original;

        const nextText = translate(original, language);
        const leading = currentText.match(/^\s*/)?.[0] ?? "";
        const trailing = currentText.match(/\s*$/)?.[0] ?? "";
        const replacement = `${leading}${nextText}${trailing}`;

        if (node.textContent !== replacement) {
          node.textContent = replacement;
        }
      }

      const attributeElements = root.querySelectorAll<HTMLElement>("[placeholder], [aria-label], [title]");

      for (const element of attributeElements) {
        for (const attr of ["placeholder", "aria-label", "title"] as const) {
          const current = element.getAttribute(attr);
          if (!current?.trim()) continue;

          const dataKey = `goalixOriginal${attr.replace(/(^|-)([a-z])/g, (_, __, letter: string) => letter.toUpperCase())}`;
          const original = element.dataset[dataKey] ?? current;
          element.dataset[dataKey] = original;
          element.setAttribute(attr, translate(original, language));
        }
      }
    };

    const applyTranslations = () => {
      const roots: HTMLElement[] = [];
      if (contentRef.current) roots.push(contentRef.current);

      document
        .querySelectorAll<HTMLElement>("[data-radix-portal], [data-radix-popper-content-wrapper], [role='dialog']")
        .forEach((element) => roots.push(element));

      roots.forEach((root) => translateRoot(root));
    };

    applyTranslations();

    const observeOptions: MutationObserverInit = {
      childList: true,
      subtree: true,
      characterData: true,
    };
    const pendingRoots = new Set<HTMLElement>();
    let animationFrame: number | null = null;

    const flushTranslations = () => {
      animationFrame = null;
      observer.disconnect();
      pendingRoots.forEach((root) => {
        if (root.isConnected) translateRoot(root);
      });
      pendingRoots.clear();
      observer.observe(document.body, observeOptions);
    };

    const scheduleTranslation = (root: HTMLElement | null) => {
      if (!root) return;
      pendingRoots.add(root);
      if (animationFrame === null) {
        animationFrame = window.requestAnimationFrame(flushTranslations);
      }
    };

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === "characterData") {
          scheduleTranslation(mutation.target.parentElement);
          continue;
        }

        mutation.addedNodes.forEach((node) => {
          if (node instanceof HTMLElement) {
            scheduleTranslation(node);
          } else {
            scheduleTranslation(node.parentElement);
          }
        });
      }
    });

    observer.observe(document.body, observeOptions);

    return () => {
      observer.disconnect();
      if (animationFrame !== null) {
        window.cancelAnimationFrame(animationFrame);
      }
    };
  }, [language, pathname]);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const notificationsEnabled =
    authState.isAuthenticated && authState.role === role;
  const {
    data: notificationsData,
    isLoading: notificationsLoading,
    isError: notificationsError,
    refetch: refetchNotifications,
  } = useGetNotificationsQuery(undefined, {
    skip: !notificationsEnabled || !notificationsOpen,
    pollingInterval: 60000,
    skipPollingIfUnfocused: true,
    refetchOnFocus: true,
    refetchOnReconnect: true,
  });
  const { data: unreadCountFromApi } = useGetUnreadNotificationsCountQuery(undefined, {
    skip: !notificationsEnabled,
    pollingInterval: 60000,
    skipPollingIfUnfocused: true,
    refetchOnFocus: true,
    refetchOnReconnect: true,
  });
  const [markNotificationRead] = useMarkNotificationReadMutation();
  const [markAllNotificationsRead, markAllNotificationsReadState] = useMarkAllNotificationsReadMutation();
  const notifications = notificationsData?.data ?? [];
  const unreadCount = typeof unreadCountFromApi === "number"
    ? unreadCountFromApi
    : notifications.filter((item) => !item.is_read).length;
  const mobileNavToggleId = `goalix-mobile-nav-toggle-${role}`;

  const toggleMobileNav = () => {
    setMobileNavOpen((current) => !current);
  };

  const closeMobileNav = () => {
    setMobileNavOpen(false);
    const toggle = document.getElementById(mobileNavToggleId) as HTMLInputElement | null;
    if (toggle) toggle.checked = false;
  };

  return (
    <div
      className={`goalix-reference-frame goalix-reference-${role}`}
      data-dashboard-theme={theme}
      data-dashboard-language={language}
      data-dashboard-density={density}
      data-dashboard-motion={motion}
      data-dashboard-focus={focusMode}
      dir={language === "ar" ? "rtl" : "ltr"}
      lang={language}
    >
      <input
        id={mobileNavToggleId}
        className="goalix-mobile-nav-checkbox"
        type="checkbox"
        aria-hidden="true"
        tabIndex={-1}
      />
      <header className="goalix-mobile-header">
        <label
          htmlFor={mobileNavToggleId}
          role="button"
          tabIndex={0}
          className="goalix-mobile-menu-button"
          aria-label={t("Menu")}
          aria-expanded={mobileNavOpen}
          onClick={toggleMobileNav}
          onKeyDown={(event) => {
            if (event.key !== "Enter" && event.key !== " ") return;
            event.preventDefault();
            const toggle = document.getElementById(mobileNavToggleId) as HTMLInputElement | null;
            if (toggle) toggle.checked = !toggle.checked;
            toggleMobileNav();
          }}
        >
          <Menu size={18} />
        </label>
        <Link href={ROLE_ROUTES[role]} className="goalix-mobile-logo" aria-label="Goalix dashboard home">
          <span className="goalix-mobile-logo-mark">G</span>
          <strong>GOALIX</strong>
        </Link>
        <div className="goalix-mobile-header-actions">
          <Link href={`/${role}/notifications`} className="goalix-mobile-notification" aria-label={t("Notifications")}>
            <Bell size={18} />
            {unreadCount > 0 && <span />}
          </Link>
          <div className="goalix-mobile-avatar" aria-label={user?.fullName || t(roleLabels[role])}>
            {getInitials(user?.fullName || role)}
          </div>
        </div>
      </header>

      <label
        htmlFor={mobileNavToggleId}
        className="goalix-mobile-nav-backdrop"
        aria-label={t("Close menu")}
        onClick={() => setMobileNavOpen(false)}
      />

      <aside className={cn("goalix-reference-sidebar", mobileNavOpen && "is-mobile-open")}>
        <Link
          href={ROLE_ROUTES[role]}
          className="goalix-reference-brand"
          aria-label="Goalix dashboard home"
          onClick={closeMobileNav}
        >
          <span className="goalix-reference-mark">G</span>
          <span>
            <strong>Goalix</strong>
            <small>{t(roleLabels[role])}</small>
          </span>
        </Link>

        <div className="goalix-mobile-drawer-tools">
          <button
            type="button"
            aria-label={language === "ar" ? t("English") : t("Arabic")}
            onClick={() => setLanguage((current) => (current === "ar" ? "en" : "ar"))}
          >
            {language === "ar" ? "EN" : "AR"}
          </button>
          <button
            type="button"
            aria-label={theme === "dark" ? t("Light theme") : t("Dark theme")}
            onClick={() => setTheme((current) => (current === "dark" ? "light" : "dark"))}
          >
            {theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
            <span>{theme === "dark" ? t("Light theme") : t("Dark theme")}</span>
          </button>
        </div>

        <div className="goalix-reference-menu-label">{t("Menu")}</div>
        <nav className="goalix-reference-nav">
          {nav.map((item) => {
            const Icon = (item.icon && iconMap[item.icon]) || LayoutDashboard;
            const active = isActive(pathname, item);
            const isOpen = openSections[item.label] ?? active;

            if (item.children?.length) {
              return (
                <div key={item.label} className={cn("goalix-reference-nav-group", isOpen && "is-open")}>
                  <button
                    type="button"
                    className={cn("goalix-reference-nav-item is-section", active && "is-active")}
                    aria-expanded={isOpen}
                    aria-label={t(item.label)}
                    title={t(item.label)}
                    onClick={() => {
                      const isMobileViewport = window.matchMedia("(max-width: 760px)").matches;

                      if (compactNav && !mobileNavOpen && !isMobileViewport) {
                        closeMobileNav();
                        router.push(firstHref(item));
                        return;
                      }

                      setOpenSections((current) => ({ ...current, [item.label]: !isOpen }));
                    }}
                  >
                    <Icon size={17} />
                    <span>{t(item.label)}</span>
                    <em>{item.children.length}</em>
                    <ChevronDown className="goalix-reference-chevron" size={15} />
                  </button>
                  <div className="goalix-reference-subnav">
                    {item.children.map((child) => {
                      const childActive = pathname === child.href || pathname.startsWith(`${child.href}/`);

                      return (
                        <Link
                          key={child.href}
                          href={child.href}
                          className={cn("goalix-reference-subnav-link", childActive && "is-active")}
                          onClick={closeMobileNav}
                        >
                          {t(child.label)}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              );
            }

            return (
              <Link
                key={item.label}
                href={item.href ?? firstHref(item)}
                className={cn("goalix-reference-nav-item", active && "is-active")}
                aria-label={t(item.label)}
                title={t(item.label)}
                onClick={closeMobileNav}
              >
                <Icon size={17} />
                <span>{t(item.label)}</span>
              </Link>
            );
          })}
        </nav>

        <div className="goalix-reference-menu-label">{t("General")}</div>
        <div className="goalix-reference-nav">
          {!hasSettingsInMainNav && (
            <Link
              href={settingsRoutes[role] ?? ROLE_ROUTES[role]}
              className="goalix-reference-nav-item"
              onClick={closeMobileNav}
            >
              <Settings size={17} />
              <span>{t("Settings")}</span>
            </Link>
          )}
          <Link href={`/${role}/help`} className="goalix-reference-nav-item" onClick={closeMobileNav}>
            <HelpCircle size={17} />
            <span>{t("Help")}</span>
          </Link>
          <button type="button" onClick={logout} className="goalix-reference-nav-item">
            <LogOut size={17} />
            <span>{t("Logout")}</span>
          </button>
        </div>

        <div className="goalix-reference-download">
          <div className="goalix-reference-download-art" />
          <strong>{t("Goalix AI Coach")}</strong>
          <p>{t("Daily insights for performance, attendance and match readiness.")}</p>
          <button type="button">{t("Open Insights")}</button>
        </div>
      </aside>

      <main className="goalix-reference-main">
        <header className="goalix-reference-topbar">
          <label className="goalix-reference-search">
            <Search size={18} />
            <input placeholder={t("Search players, sessions, matches...")} />
            <kbd>{t("Ctrl F")}</kbd>
          </label>

          <div className="goalix-reference-top-actions">
            {role === "parent" && <ParentChildSwitcher t={t} />}
            <div className="goalix-reference-switches">
              <button
                type="button"
                className="goalix-reference-pill-control"
                aria-label={language === "ar" ? t("English") : t("Arabic")}
                onClick={() => setLanguage((current) => (current === "ar" ? "en" : "ar"))}
              >
                <span>{language === "ar" ? "EN" : "AR"}</span>
              </button>
              <button
                type="button"
                className="goalix-reference-pill-control"
                aria-label={theme === "dark" ? t("Light theme") : t("Dark theme")}
                onClick={() => setTheme((current) => (current === "dark" ? "light" : "dark"))}
              >
                {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
                <span>{theme === "dark" ? t("Light theme") : t("Dark theme")}</span>
              </button>
            </div>
            <div className="goalix-reference-message-menu" ref={messageMenuRef}>
              <button
                type="button"
                className="goalix-reference-message-trigger"
                aria-label={t("Messages")}
                aria-expanded={messageMenuOpen}
                onClick={() => setMessageMenuOpen((current) => !current)}
              >
                <Mail size={18} />
              </button>
              {messageMenuOpen && (
                <div className="goalix-reference-message-panel" role="menu" aria-label={t("Messages")}>
                  <strong>{t("Community")}</strong>
                  {communityWhatsappHref ? (
                    <a
                      href={communityWhatsappHref}
                      target="_blank"
                      rel="noreferrer"
                      role="menuitem"
                      onClick={() => setMessageMenuOpen(false)}
                    >
                      <MessageSquare size={16} />
                      <span>{t("WhatsApp Community")}</span>
                      <ExternalLink size={14} />
                    </a>
                  ) : (
                    <p>{t("WhatsApp community link is not set yet.")}</p>
                  )}
                  {role === "admin" && (
                    <Link href="/admin/settings" role="menuitem" onClick={() => setMessageMenuOpen(false)}>
                      <Settings size={16} />
                      <span>{t("Edit community link")}</span>
                    </Link>
                  )}
                </div>
              )}
            </div>
            <div className="goalix-reference-notifications">
              <button
                type="button"
                className="goalix-reference-notification-trigger"
                aria-label={t("Notifications")}
                aria-expanded={notificationsOpen}
                onClick={() => setNotificationsOpen((current) => !current)}
              >
                <Bell size={18} />
                {unreadCount > 0 && (
                  <span className="goalix-reference-notification-badge">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </button>
              {notificationsOpen && (
                <div className="goalix-reference-notification-panel" role="dialog" aria-label={t("Notifications")}>
                  <div className="goalix-reference-notification-head">
                    <div>
                      <strong>{t("Notifications")}</strong>
                      <small>{unreadCount} {t("unread")}</small>
                    </div>
                    <div>
                      <button
                        type="button"
                        aria-label={t("Refresh notifications")}
                        disabled={!notificationsEnabled}
                        onClick={() => {
                          if (notificationsEnabled) refetchNotifications();
                        }}
                      >
                        <RefreshCw size={14} />
                      </button>
                      {unreadCount > 0 && (
                        <button
                          type="button"
                          disabled={markAllNotificationsReadState.isLoading}
                          onClick={() => markAllNotificationsRead()}
                        >
                          <CheckCheck size={14} />
                          <span>{t("Read all")}</span>
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="goalix-reference-notification-list">
                    {notificationsLoading ? (
                      <div className="goalix-reference-notification-empty">{t("Loading notifications...")}</div>
                    ) : notificationsError ? (
                      <div className="goalix-reference-notification-empty">{t("Could not load notifications.")}</div>
                    ) : notifications.length ? (
                      notifications.slice(0, 8).map((notification) => {
                        const localized = localizeNotification(notification, language);

                        return (
                          <Link
                            key={notification.id}
                            href={getNotificationHref(role, notification.type, notification.data)}
                            className={cn(
                              "goalix-reference-notification-row",
                              !notification.is_read && "is-unread",
                            )}
                            onClick={() => {
                              setNotificationsOpen(false);
                              if (!notification.is_read) {
                                markNotificationRead(notification.id);
                              }
                            }}
                          >
                            <span />
                            <div>
                              <strong>{localized.title}</strong>
                              <p>{localized.body}</p>
                              <small>
                                {formatDateTime(
                                  notification.created_at,
                                  language === "ar" ? "ar-EG" : "en-US",
                                )}
                              </small>
                            </div>
                          </Link>
                        );
                      })
                    ) : (
                      <div className="goalix-reference-notification-empty">{t("No notifications yet.")}</div>
                    )}
                  </div>

                  <Link
                    className="goalix-reference-notification-all"
                    href={`/${role}/notifications`}
                    onClick={() => setNotificationsOpen(false)}
                  >
                    {t("View all notifications")}
                  </Link>
                </div>
              )}
            </div>
            <div className="goalix-reference-user">
              <span>{getInitials(user?.fullName || role)}</span>
              <div>
                <strong>{user?.fullName || t(roleLabels[role])}</strong>
                <small>{user?.email || `${role}@goalix.local`}</small>
              </div>
            </div>
          </div>
        </header>

        <div ref={contentRef} className="goalix-reference-content">
          {pagePermissionLoading ? (
            <div className="flex min-h-[45vh] items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              Checking coach permissions...
            </div>
          ) : pagePermissionDenied ? (
            <div className="mx-auto flex min-h-[45vh] max-w-xl items-center justify-center">
              <div className="w-full rounded-xl border border-amber-500/30 bg-amber-500/10 p-6 text-center">
                <ShieldAlert className="mx-auto h-9 w-9 text-amber-300" />
                <h1 className="mt-3 text-lg font-semibold">Access not assigned</h1>
                <p className="mt-2 text-sm text-muted-foreground">
                  Your current role does not include permission for this page.
                  Ask an academy administrator to update your role or permission grants.
                </p>
                <button
                  type="button"
                  className="mt-4 rounded-md border border-border px-4 py-2 text-sm hover:bg-muted/50"
                  onClick={() => router.replace(firstAllowedHref || ROLE_ROUTES[role] || "/")}
                >
                  Back to home
                </button>
              </div>
            </div>
          ) : (
            children
          )}
        </div>
      </main>
    </div>
  );
}

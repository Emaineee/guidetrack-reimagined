export const guides = {
  booking: {
    reply: 'To request a real appointment, open Live scheduling.\n1. Select Appointment, then choose a guidance team member and service.\n2. Pick one of that staff member\'s published dates and times. Times are shown in Philippine time.\n3. Select Send request. Open My requests to check its status. Pending means the staff member still needs to review it.',
    path: '/scheduling.html', label: 'Open Live scheduling',
  },
  availability: {
    reply: 'Open Live scheduling and pick a guidance team member. Use Filter times by date to narrow the available slots. Staff publish times between 8:00 AM and 6:00 PM Philippine time. If no times appear, try another team member or ask your counselor about availability using the email in the directory.',
    path: '/scheduling.html', label: 'Check available times',
  },
  status: {
    reply: 'Open My requests. Pending means it is waiting for staff review, Accepted means staff approved it, Ongoing means the visit has started, and Completed means staff marked it finished. You can filter the list by status, type, or scheduled date.',
    path: '/scheduling.html#my-requests', label: 'Open My requests',
  },
  cancellation: {
    reply: 'Open My requests, find the appointment or referral, then choose Cancel request and confirm. You can cancel your own Pending or Accepted requests. For a different appointment time, cancel the original request and submit a new one from an available slot. If the visit is already ongoing, contact the Guidance Center.',
    path: '/scheduling.html#my-requests', label: 'Manage my requests',
  },
  export: {
    reply: 'Open My requests and look for Add to calendar on an accepted appointment with a time. Download the calendar file and open it in your calendar app. Copy time also lets you copy the appointment date and Philippine time.',
    path: '/scheduling.html#my-requests', label: 'Find my appointment',
  },
  referrals: {
    reply: 'For a real self-referral, open Live scheduling, choose Self-referral, select a guidance team member and service, then choose Send request. Self-referrals do not require you to book a time first. Check My requests for updates. The separate practice referral form is for sample data.',
    path: '/scheduling.html?request=referral', label: 'Start a self-referral',
  },
  directory: {
    reply: 'Open Guidance Personnel to find staff roles, clusters, and university email addresses. Search by name, role, or cluster and use the email link to contact someone directly. For a real appointment request, choose a published time in Live scheduling.',
    path: '/#guidance', label: 'Open Guidance Personnel',
  },
  testing: {
    reply: 'For psychological testing, use Live scheduling and select Psychological testing as the service. The Guidance Personnel directory lists Brian Nickie B. Guevarra as the psychometrician. Ask the center about eligibility, preparation, and available assessments.',
    path: '/scheduling.html', label: 'Go to Live scheduling',
  },
  walkin: {
    reply: 'To ask about an unscheduled visit, contact the Guidance Center directly for its current walk-in arrangements. The Walk-ins page in GuideTrack is a practice workflow and does not check you in at the office.',
    path: '/#guidance', label: 'Find Guidance Center contacts',
  },
  messages: {
    reply: 'For a real message, open Guidance Personnel and use the staff member\'s university email address. GuideTrack\'s Messaging page is a practice workspace, so messages entered there are not delivered to staff.',
    path: '/#guidance', label: 'Find staff email addresses',
  },
  settings: {
    reply: 'Open Settings beside Log out. You can adjust contrast, text size, or motion and use Restore defaults to reset those preferences. Your display choices are saved in this browser.',
    path: '/settings.html', label: 'Open Settings',
  },
  calendar: {
    reply: 'Use My requests for real appointments and Add to calendar for an accepted visit with a scheduled time. The Practice calendar is a separate tool for exploring sample appointments, walk-ins, and follow-ups.',
    path: '/scheduling.html#my-requests', label: 'See my live requests',
  },
  login: {
    reply: 'Use Log in with the email and password you signed up with. Students can create an account with a regular email address. Staff activation uses a privately issued invitation and the assigned university email. Never share a password or invitation code in this chat.',
    path: '/login.html', label: 'Open Log in',
  },
  staff: {
    reply: 'Activated personnel can open Live scheduling to publish availability and manage their assigned requests. The workspace allows staff to accept or decline, refer to a colleague, start a visit, and mark it completed. Staff access is assigned separately from student sign-up.',
    path: '/scheduling.html', label: 'Open the scheduling workspace',
  },
  privacy: {
    reply: 'Leave names, student IDs, passwords, and private case details out of this chat and the practice forms. For questions about what the Guidance Center records, who can see it, or the limits of confidentiality, ask your counselor before sharing sensitive information.',
    path: '/#guidance', label: 'Contact the Guidance Center',
  },
  wellbeing: {
    reply: 'Student Well-being has self-help topics, a checklist for preparing for a guidance visit, and information on how to find support. Choose a topic like exam stress, sleep, or helping a friend here in chat for a few practical starting points.',
    path: '/#wellbeing', label: 'Explore Student Well-being',
  },
};

export const guidePatterns = [
  ['privacy', /\b(?:privacy|confidential\w*|personal data|student id)\b/i],
  ['cancellation', /\b(?:cancel\w*|reschedul\w*|change (?:my |the )?(?:appointment|booking|time))\b/i],
  ['export', /\b(?:add (?:this appointment |my appointment |the appointment )?to (?:my |the )?calendar|google calendar|outlook calendar|calendar file|\.ics|copy (?:the )?time)\b/i],
  ['staff', /\b(?:staff activation|activate (?:my |a )?(?:(?:staff |personnel )account|invitation)|staff access|publish (?:my |your )?availability|staff test view|accept (?:a |an |the )?(?:appointment|request|referral))\b/i],
  ['testing', /\b(?:psychological test\w*|psychometrician|brian guevarra)\b/i],
  ['availability', /\b(?:available (?:slots?|times?)|no (?:times?|slots?)|availability|office hours|opening hours|what time (?:can|are|do)|8\s*am|6\s*pm)\b/i],
  ['status', /\b(?:my requests|request status|what does (?:pending|accepted|ongoing|completed) mean|appointment status|waiting for (?:approval|confirmation)|track (?:my )?(?:referral|appointment))\b/i],
  ['referrals', /\b(?:referral|referrals|self[ -]refer\w*|refer (?:myself|someone))\b/i],
  ['booking', /\b(?:appointments?|book(?:ing)? (?:a |an )?(?:visit|session)|schedule (?:a |an )?(?:visit|consultation|session)|appointment workflow|magpa appointment)\b/i],
  ['walkin', /\bwalk[ -]?ins?\b/i],
  ['messages', /\b(?:messaging|send (?:a |them )?message|inbox|message (?:my |a )?counselor)\b/i],
  ['settings', /\b(?:settings|font size|text size|contrast|reduced motion|reduce motion)\b/i],
  ['calendar', /\bcalendar\b/i],
  ['login', /\b(?:sign[ -]?up|sign[ -]?in|log[ -]?in|password|register|create (?:an |a )?account)\b/i],
  ['directory', /\b(?:directory|guidance personnel|counselor email|find (?:a |my |the )?counselor|contact (?:the )?guidance)\b/i],
  ['wellbeing', /\b(?:student well[ -]?being|self[ -]?help|workshops|well[ -]?being resources)\b/i],
];

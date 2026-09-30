import { fakerEN_IN as faker } from '@faker-js/faker';
import db from './index.js';

faker.seed(42);

// Timestamps are relative to "now". Set SEED_NOW (ISO string) to pin them.
const NOW = process.env.SEED_NOW ? new Date(process.env.SEED_NOW) : new Date();
const DAY = 864e5;
const MIDNIGHT = Date.UTC(NOW.getUTCFullYear(), NOW.getUTCMonth(), NOW.getUTCDate());

// ---------------------------------------------------------------- helpers
const pick = (a) => faker.helpers.arrayElement(a);
const int = (min, max) => faker.number.int({ min, max });
const chance = (p) => faker.number.float({ min: 0, max: 1 }) < p;
const shuffle = (a) => faker.helpers.shuffle(a);
const slug = (s) => s.replace(/[^A-Za-z0-9]+/g, '_').replace(/^_|_$/g, '');
const letters = (n) => faker.string.alpha({ length: n, casing: 'lower' });
const meetUrl = () => `https://meet.google.com/${letters(3)}-${letters(4)}-${letters(3)}`;
const sha = () => faker.string.hexadecimal({ length: 7, prefix: '', casing: 'lower' });

const minutesAgo = (m) => new Date(NOW.getTime() - m * 60000);
const sqlDate = (d) => d.toISOString().slice(0, 19).replace('T', ' ');
const fdate = (d) =>
  d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' });
const fdatetime = (d) =>
  d.toLocaleString('en-GB', {
    weekday: 'short', day: 'numeric', month: 'short',
    hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'UTC',
  });
const fut = (d, days) => fdate(new Date(d.getTime() + days * DAY));

// A random working-hours timestamp between minDay and maxDay days ago, as minutes-ago.
function randomAgo(minDay = 1, maxDay = 59) {
  const t = MIDNIGHT - int(minDay, maxDay) * DAY + int(6 * 60, 22 * 60) * 60000;
  return Math.round((NOW.getTime() - t) / 60000);
}
function todayAgo() {
  const sinceMidnight = Math.floor((NOW.getTime() - MIDNIGHT) / 60000);
  return sinceMidnight < 15 ? randomAgo(1, 1) : int(3, sinceMidnight - 1);
}

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
function toHtml(text) {
  return text
    .split(/\n{2,}/)
    .map((block) => {
      const groups = [];
      for (const line of block.split('\n')) {
        const q = line.startsWith('>');
        const last = groups[groups.length - 1];
        if (last && last.q === q) last.lines.push(line);
        else groups.push({ q, lines: [line] });
      }
      return groups
        .map((g) =>
          g.q
            ? `<blockquote>${g.lines.map((l) => esc(l.replace(/^>\s?/, ''))).join('<br>')}</blockquote>`
            : `<p>${g.lines.map(esc).join('<br>')}</p>`
        )
        .join('');
    })
    .join('\n');
}

const MIME = {
  pdf: 'application/pdf',
  png: 'image/png',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
};
const SIZE = { pdf: [80_000, 3_500_000], png: [60_000, 2_400_000], docx: [18_000, 480_000] };
const att = (kind, name, mentioned = false) => ({
  filename: `${name}.${kind}`,
  mime_type: MIME[kind],
  size_bytes: int(...SIZE[kind]),
  mentioned, // body text refers to it, so it is always kept
});

// ------------------------------------------------------------------ users
const COLORS = [
  '#ef4444', '#f97316', '#f59e0b', '#84cc16', '#10b981', '#14b8a6',
  '#06b6d4', '#3b82f6', '#6366f1', '#8b5cf6', '#d946ef', '#ec4899',
];
const COMPANIES = [
  'Nimbus Labs', 'Zenith Systems', 'Corvus Technologies', 'BlueOrbit Software', 'Quantiva',
  'Lumen Analytics', 'Kestrel Cloud', 'Northwind Digital', 'Pixelforge', 'Helix Data',
];

const users = [];
const usedEmails = new Set();
function addUser(name, email, role, extra = {}) {
  const u = { id: users.length + 1, name, email, role, avatar_color: COLORS[users.length % COLORS.length], ...extra };
  users.push(u);
  usedEmails.add(email);
  return u;
}
function person(role, domain, extra = {}) {
  for (;;) {
    const first = faker.person.firstName();
    const last = faker.person.lastName();
    const email = `${first}.${last}`.toLowerCase().replace(/[^a-z.]/g, '') + '@' + domain;
    if (!usedEmails.has(email)) return addUser(`${first} ${last}`, email, role, { first, last, ...extra });
  }
}

const me = addUser('Adeela Azeez', 'adeela@mailbox.dev', 'me', { first: 'Adeela' });
for (let i = 0; i < 4; i++) person('teammate', 'mailbox.dev');
for (const company of shuffle(COMPANIES).slice(0, 3)) {
  person('recruiter', company.toLowerCase().replace(/[^a-z]/g, '') + '.com', { company });
}
person('friend', 'gmail.com');
person('friend', 'gmail.com');
person('family', 'gmail.com');
person('professor', 'college.edu');
person('mentor', 'gmail.com');

const org = {};
for (const [key, name, email] of [
  ['github', 'GitHub', 'notifications@github.com'],
  ['linkedin', 'LinkedIn', 'notifications-noreply@linkedin.com'],
  ['bank', 'HDFC Bank', 'alerts@hdfcbank.net'],
  ['coursera', 'Coursera', 'no-reply@coursera.org'],
  ['medium', 'Medium Daily Digest', 'noreply@medium.com'],
  ['amazon', 'Amazon.in', 'store-news@amazon.in'],
  ['swiggy', 'Swiggy', 'noreply@swiggy.in'],
  ['placement', 'Training & Placement Cell', 'placements@college.edu'],
  ['calendar', 'Google Calendar', 'calendar-notification@google.com'],
  ['devweekly', 'Dev Weekly', 'hello@devweekly.io'],
  ['spam1', 'Lucky Rewards Center', 'claim@lucky-rewards-center.biz'],
  ['spam2', 'Account Security Team', 'support@secure-verify-login.info'],
  ['spam3', 'Crypto Gains', 'vip@cryptogains-now.top'],
]) {
  org[key] = addUser(name, email, 'org');
}
const R = (role) => users.filter((u) => u.role === role);

const LABELS = [
  ['Work', '#3b82f6'],
  ['Placements', '#10b981'],
  ['Projects', '#8b5cf6'],
  ['Finance', '#f59e0b'],
  ['Personal', '#ec4899'],
];

// ---------------------------------------------------------------- content
const ROLES = [
  'Software Engineer', 'Associate Software Engineer', 'Frontend Developer',
  'Backend Developer', 'Data Analyst', 'Full Stack Developer', 'Graduate Engineer Trainee',
];
const FEATURES = [
  'search filters', 'thread view', 'snooze', 'label management', 'attachment previews',
  'keyboard shortcuts', 'dark mode', 'bulk actions', 'compose window', 'notification settings',
];
const FILES = [
  'src/components/ThreadList.jsx', 'server/routes/emails.js', 'src/hooks/useMailbox.js',
  'server/db/queries.js', 'src/components/Sidebar.jsx',
];
const PROJECTS = [
  'Sentiment Analysis of Product Reviews', 'Smart Attendance System using Face Recognition',
  'Traffic Sign Recognition with CNNs', 'Campus Navigation App', 'Fake News Detection using NLP',
];
const PLACES = ['Lonavala', 'Sinhagad Fort', 'Alibaug', 'Hampi', 'Coorg', 'Mahabaleshwar'];
const ARTICLES = [
  'Why I stopped using useEffect for data fetching',
  'SQLite is enough for most side projects',
  'A visual guide to database indexes',
  'How we cut our Docker image size by 80%',
  'Stop writing so many unit tests for React components',
  'System design interviews: what actually gets asked',
  'Understanding the JavaScript event loop, once and for all',
];
const ITEMS = [
  'Logitech MX Keys Wireless Keyboard', 'boAt Rockerz 450 Bluetooth Headphones',
  'Atomic Habits (Paperback)', 'Portronics Laptop Stand', 'Anker 20000mAh Power Bank',
];
const COURSES = [
  'Google Data Analytics Certificate', 'Meta Front-End Developer Certificate',
  'Deep Learning Specialization', 'Python for Everybody',
];
const LECTURES = ['Operating Systems', 'Computer Networks', 'DBMS Normalization', 'Design & Analysis of Algorithms'];

const T = {}; // singleton templates: name -> { cat, gen(date) }
const tpl = (name, cat, gen) => { T[name] = { cat, gen }; };

// ---- primary
tpl('placementDrive', 'primary', (d) => {
  const company = pick(COMPANIES), role = pick(ROLES);
  const ctc = pick(['4.5', '6.0', '7.2', '8.5', '10.0', '12.0']);
  const cgpa = pick(['6.0', '6.5', '7.0']);
  return {
    from: org.placement, label: 'Placements', important: true,
    subject: `Campus Drive: ${company} – ${role} (registration open)`,
    text: `Dear Students,\n\n${company} will be visiting campus on ${fut(d, 9)} for the ${role} position (CTC: ₹${ctc} LPA).\n\nEligibility:\n- B.E./B.Tech in CS/IT/ECE with a minimum of ${cgpa} CGPA\n- No active backlogs\n\nSelection process: online assessment, technical interview, HR interview.\n\nRegister on the placement portal before ${fut(d, 5)}, 5:00 PM. Late registrations will not be entertained.\n\nRegards,\nTraining & Placement Cell`,
    attach: att('pdf', `${slug(company)}_JD_${slug(role)}`),
  };
});
tpl('interviewInvite', 'primary', (d) => {
  const r = pick(R('recruiter')), role = pick(ROLES);
  return {
    from: r, label: 'Placements', important: true,
    subject: `Interview invitation – ${role} at ${r.company}`,
    text: `Hi Adeela,\n\nThank you for applying for the ${role} position at ${r.company}. We were impressed by your profile and would like to invite you for a technical interview.\n\nDate: ${fut(d, 3)}\nTime: ${pick(['10:00 AM', '11:30 AM', '3:00 PM', '4:30 PM'])} IST\nMode: Google Meet (${meetUrl()})\nDuration: 45 minutes\n\nPlease confirm your availability by replying to this email.\n\nBest regards,\n${r.name}\nTalent Acquisition, ${r.company}`,
  };
});
tpl('recruiterOutreach', 'primary', () => {
  const r = pick(R('recruiter')), role = pick(ROLES);
  return {
    from: r, label: 'Placements',
    subject: `Exciting ${role} opportunity at ${r.company}`,
    text: `Hi Adeela,\n\nI came across your GitHub profile and your work on email-client projects caught my eye. We're hiring a ${role} at ${r.company} and I think your skills in React and Node.js would be a great fit.\n\nThe role is hybrid, with a compensation range of ₹${int(8, 16)}–${int(17, 24)} LPA. Would you be open to a quick 15-minute chat this week?\n\nBest,\n${r.first}\n${r.company}`,
  };
});
tpl('profNote', 'primary', () => {
  const p = R('professor')[0];
  return {
    from: p, label: 'Projects',
    subject: `Feedback on your ${pick(['mid-semester report', 'project synopsis', 'lab record'])}`,
    text: `Hi Adeela,\n\nI went through your submission. The implementation is solid, but the problem statement needs to be sharper and the results section should include a comparison with at least two baselines.\n\nPlease revise and resubmit by ${fut(NOW, 6)}. Come see me in my cabin if you'd like to discuss.\n\nDr. ${p.last}\nDepartment of Computer Science`,
  };
});
tpl('friendMsg', 'primary', () => {
  const f = pick(R('friend'));
  const v = pick([
    ['Are you joining the hackathon?', `Hey,\n\nThe college hackathon registrations close tonight. I'm forming a team of four and we still need a frontend person. You in? Your email project would be a great starting point.\n\n– ${f.first}`],
    ["Notes for tomorrow's lab", `Hi Adeela,\n\nCan you send me the lab manual for experiment ${int(4, 9)}? I left mine in the hostel. Also, did Sir extend the submission date?\n\nThanks!\n${f.first}`],
    ['Did you see this?', `Look at this: the placement cell just posted the shortlist for the first round. Your name is on it! Check the portal.\n\n– ${f.first}`],
  ]);
  return { from: f, label: 'Personal', subject: v[0], text: v[1] };
});
tpl('teamAnnounce', 'primary', () => {
  const t = pick(R('teammate'));
  const f1 = pick(FEATURES), f2 = pick(FEATURES);
  return {
    from: t, label: 'Work',
    subject: `Release v0.${int(3, 9)}.${int(0, 4)} is live`,
    text: `Hi team,\n\nThe new release is now live in production.\n\nWhat's new:\n- Improved ${f1}\n- Fixed a rendering bug in ${f2}\n- Dependency updates and minor performance fixes\n\nPlease report any regressions in the team channel.\n\nThanks,\n${t.first}`,
  };
});
tpl('familyMsg', 'primary', () => {
  const f = R('family')[0];
  return {
    from: f, label: 'Personal',
    subject: "Call me when you're free",
    text: `Hi Adeela,\n\nHope your preparation is going well. Call me when you get a chance, nothing urgent. Don't forget to eat properly and get enough sleep!\n\n– ${f.first}`,
  };
});

// ---- promotions
tpl('amazonDeal', 'promotions', () => {
  const item = pick(ITEMS), off = pick([30, 40, 50, 60]);
  return {
    from: org.amazon,
    subject: `Up to ${off}% off | Deals on ${item.split(' ')[0]} & more`,
    text: `Hello Adeela,\n\nToday's top picks for you:\n\n${item} – ₹${int(6, 45) * 100 + 99} (${off}% off)\n\nDeals end tonight at 11:59 PM. Free delivery on orders above ₹499.\n\nHappy shopping,\nAmazon.in`,
  };
});
tpl('swiggyOffer', 'promotions', () => ({
  from: org.swiggy,
  subject: 'Adeela, 60% off up to ₹120 on your next order 🍕',
  text: `Hungry?\n\nUse code WELCOME60 to get 60% off up to ₹120 on orders above ₹199. Valid on your next order from participating restaurants until this weekend.\n\nOrder now on the Swiggy app.\n\nTeam Swiggy`,
}));
tpl('courseraSale', 'promotions', () => {
  const course = pick(COURSES);
  return {
    from: org.coursera,
    subject: `Last chance: ${int(4, 7) * 10}% off ${course}`,
    text: `Hi Adeela,\n\nBuild job-ready skills with the ${course}. Enroll this week and get a discount on your first month. Learn at your own pace and earn a certificate you can share on LinkedIn.\n\nStart learning today.\n\nThe Coursera Team`,
  };
});
tpl('hdfcOffer', 'promotions', () => ({
  from: org.bank,
  subject: 'Pre-approved: lifetime-free credit card just for you',
  text: `Dear Adeela Azeez,\n\nYou have a pre-approved ${pick(['Regalia', 'MoneyBack+', 'Millennia'])} credit card with a lifetime-free joining fee. Enjoy cashback on online spends and 4 complimentary airport lounge visits per year.\n\nApply in 3 minutes on NetBanking or the mobile app.\n\nT&C apply. HDFC Bank`,
}));
tpl('linkedinPremium', 'promotions', () => ({
  from: org.linkedin,
  subject: 'Adeela, try Premium free for 1 month',
  text: `Hi Adeela,\n\nSee who's viewed your profile, get InMail credits to reach recruiters directly, and stand out as a top applicant on jobs you apply to.\n\nStart your free 1-month trial. Cancel anytime.\n\nThe LinkedIn Team`,
}));
tpl('devWeekly', 'promotions', () => {
  const [a, b, c] = shuffle(ARTICLES);
  return {
    from: org.devweekly,
    subject: `Dev Weekly #${int(180, 260)}: ${a}`,
    text: `This week in web development:\n\n1. ${a}\n2. ${b}\n3. ${c}\n\nAlso: a new release of Vite brings faster cold starts, and the React team shared more on the upcoming compiler.\n\nHappy coding,\nDev Weekly\n\nYou are receiving this because you subscribed at devweekly.io. Unsubscribe anytime.`,
  };
});
tpl('mediumDigest', 'promotions', () => {
  const [a, b, c] = shuffle(ARTICLES);
  return {
    from: org.medium,
    subject: `Stories for Adeela: ${a}`,
    text: `Today's highlights, picked for you:\n\n${a}\n${int(4, 12)} min read\n\n${b}\n${int(4, 12)} min read\n\n${c}\n${int(4, 12)} min read\n\nRead more on Medium.`,
  };
});

// ---- social
tpl('linkedinInvite', 'social', () => {
  const name = faker.person.fullName();
  return {
    from: org.linkedin,
    subject: `${name} wants to connect with you`,
    text: `Hi Adeela,\n\n${name}, ${pick(['Software Engineer', 'Technical Recruiter', 'Data Scientist', 'Engineering Manager'])} at ${pick(COMPANIES)}, wants to connect with you on LinkedIn.\n\nAccept or view their profile to see mutual connections.\n\nThe LinkedIn Team`,
  };
});
tpl('linkedinReaction', 'social', () => {
  const name = faker.person.fullName();
  return {
    from: org.linkedin,
    subject: `${name} and ${int(3, 40)} others reacted to your post`,
    text: `Hi Adeela,\n\nYour post about building an email client with React and SQLite is getting attention. ${name} and others reacted to it. See who's engaging with your post and reply to comments.\n\nThe LinkedIn Team`,
  };
});
tpl('linkedinViews', 'social', () => ({
  from: org.linkedin,
  subject: `Your profile was viewed ${int(8, 35)} times this week`,
  text: `Hi Adeela,\n\nPeople from ${pick(COMPANIES)}, ${pick(COMPANIES)} and other companies viewed your profile this week. Keep your profile up to date so recruiters can find you.\n\nThe LinkedIn Team`,
}));
tpl('githubFollower', 'social', () => {
  const u = faker.internet.username().toLowerCase();
  return {
    from: org.github,
    subject: `${u} started following you`,
    text: `${u} is now following you on GitHub.\n\nhttps://github.com/${u}\n\nYou can unsubscribe from these emails in your notification settings.`,
  };
});
tpl('mediumFollower', 'social', () => {
  const name = faker.person.fullName();
  return {
    from: org.medium,
    subject: `${name} is now following you on Medium`,
    text: `Hi Adeela,\n\n${name} started following you on Medium. Your stories will now appear in their feed.\n\nThe Medium Team`,
  };
});

// ---- updates
tpl('githubPR', 'updates', () => {
  const t = pick(R('teammate')), n = int(100, 480), f = pick(FEATURES);
  return {
    from: org.github, label: 'Projects',
    subject: `[mailbox-dev/mailbox] Add ${f} (PR #${n})`,
    text: `@${t.first.toLowerCase()} requested your review on this pull request.\n\nAdd ${f}\n\n+${int(40, 400)} −${int(2, 90)} across ${int(2, 9)} files.\n\nView it on GitHub: https://github.com/mailbox-dev/mailbox/pull/${n}\n\nYou are receiving this because your review was requested.`,
  };
});
tpl('githubCI', 'updates', () => {
  const n = int(500, 900);
  return {
    from: org.github, label: 'Projects',
    subject: `[mailbox-dev/mailbox] Run failed: CI - main (${sha()})`,
    text: `CI workflow run #${n} failed.\n\nJob: test (node 20)\nFailed step: npm test\n\n  ✗ ThreadList › renders unread emails in bold\n\nView the run: https://github.com/mailbox-dev/mailbox/actions/runs/${n}${int(1000, 9999)}\n\nYou are receiving this because you pushed to main.`,
  };
});
tpl('githubIssue', 'updates', () => {
  const t = pick(R('teammate')), n = int(20, 200), f = pick(FEATURES);
  return {
    from: org.github, label: 'Projects',
    subject: `Re: [mailbox-dev/mailbox] ${f} not working on Safari (#${n})`,
    text: `@${t.first.toLowerCase()} commented on this issue:\n\n"Reproduced on Safari 17. The ${f} handler relies on a CSS feature Safari doesn't support yet. I'll add a fallback."\n\nReply to this email directly or view it on GitHub: https://github.com/mailbox-dev/mailbox/issues/${n}`,
  };
});
tpl('bankDebit', 'updates', (d) => ({
  from: org.bank, label: 'Finance',
  subject: `Alert: ₹${int(1, 90) * 50 + 49} debited from A/c XX4821`,
  text: `Dear Customer,\n\nRs. ${int(1, 90) * 50 + 49}.00 has been debited from your account XX4821 on ${fdate(d)} towards UPI transaction to ${faker.person.fullName().toLowerCase().replace(/ /g, '.')}@okaxis.\n\nAvailable balance: Rs. ${int(4, 60) * 1000 + 312}.50\n\nIf you did not authorise this transaction, call 1800 202 6161 immediately.\n\nHDFC Bank`,
}));
tpl('bankCredit', 'updates', (d) => ({
  from: org.bank, label: 'Finance',
  subject: `₹${int(2, 30) * 500} credited to your account XX4821`,
  text: `Dear Customer,\n\nRs. ${int(2, 30) * 500}.00 has been credited to your account XX4821 on ${fdate(d)} via UPI from ${faker.person.fullName()}.\n\nThank you for banking with us.\n\nHDFC Bank`,
}));
tpl('bankStatement', 'updates', (d) => {
  const month = d.toLocaleString('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' });
  return {
    from: org.bank, label: 'Finance',
    subject: `Your HDFC Bank account statement for ${month}`,
    text: `Dear Adeela Azeez,\n\nYour statement for account XX4821 for ${month} is ready. It is password protected: use the first four letters of your name in capitals followed by your date of birth (DDMM).\n\nHDFC Bank`,
    attach: att('pdf', `Statement_XX4821_${slug(month)}`),
  };
});
tpl('amazonShipped', 'updates', (d) => {
  const item = pick(ITEMS);
  return {
    from: org.amazon,
    subject: `Shipped: "${item}"`,
    text: `Hello Adeela,\n\nYour package has shipped.\n\n${item}\nOrder #40${int(1, 9)}-${int(1000000, 9999999)}-${int(1000000, 9999999)}\n\nArriving: ${fut(d, 2)}\n\nTrack your package in Your Orders.\n\nAmazon.in`,
  };
});
tpl('calendarInvite', 'updates', (d) => {
  const t = pick(R('teammate'));
  const ev = pick(['Sprint planning', 'Design sync', 'Mock interview', 'Team retro', '1:1 with mentor']);
  return {
    from: org.calendar, label: 'Work',
    subject: `Invitation: ${ev} @ ${fut(d, 2)}, ${pick(['10:00', '11:30', '15:00', '16:30'])} IST`,
    text: `${t.name} has invited you to ${ev}.\n\nWhen: ${fut(d, 2)}\nWhere: ${meetUrl()}\nOrganizer: ${t.email}\n\nReply: Yes, No or Maybe.\n\nInvitation from Google Calendar`,
  };
});

// ---- sent
tpl('sentApplication', 'primary', () => {
  const r = pick(R('recruiter')), role = pick(ROLES);
  return {
    from: me, to: [r], label: 'Placements',
    subject: `Application for ${role} – Adeela Azeez`,
    text: `Dear ${r.first},\n\nI am writing to apply for the ${role} position at ${r.company}. I am a final-year Computer Science student with hands-on experience in React, Node.js and SQL, and I recently built a full-stack email client as a personal project.\n\nPlease find my resume attached. I would welcome the opportunity to discuss how I can contribute to your team.\n\nRegards,\nAdeela Azeez`,
    attach: att('pdf', 'Adeela_Azeez_Resume', true),
  };
});
tpl('sentThanks', 'primary', () => {
  const r = pick(R('recruiter')), role = pick(ROLES);
  return {
    from: me, to: [r], label: 'Placements',
    subject: `Thank you – ${role} interview`,
    text: `Dear ${r.first},\n\nThank you for taking the time to interview me today for the ${role} role. I enjoyed learning more about the team at ${r.company} and the problems you're working on. Our discussion made me even more excited about the opportunity.\n\nPlease let me know if you need anything else from my side.\n\nRegards,\nAdeela`,
  };
});
tpl('sentLOR', 'primary', () => {
  const p = R('professor')[0];
  return {
    from: me, to: [p], label: 'Placements',
    subject: 'Request for Letter of Recommendation',
    text: `Dear Dr. ${p.last},\n\nI hope you are well. I am applying for a few positions and would be grateful if you could write a letter of recommendation for me, based on my work in your Software Engineering course and my project under your guidance.\n\nThe deadline is ${fut(NOW, 12)}. I can share my resume and a short summary of my work if that helps.\n\nThank you for your time.\n\nRegards,\nAdeela Azeez`,
  };
});
tpl('sentTeamUpdate', 'primary', () => {
  const [a, b, c] = shuffle(R('teammate'));
  const f = pick(FEATURES);
  return {
    from: me, to: [a], cc: [b], bcc: chance(0.3) ? [c] : [], label: 'Work',
    subject: `Update: ${f} progress`,
    text: `Hi ${a.first},\n\nQuick status on ${f}:\n\n- Done: API endpoints and DB queries\n- In progress: UI wiring, about 60% complete\n- Blocked: waiting on final designs for the empty state\n\nI expect a PR by ${fut(NOW, 2)}.\n\nRegards,\nAdeela`,
  };
});
tpl('sentNotes', 'primary', () => {
  const f = pick(R('friend')), lec = pick(LECTURES);
  return {
    from: me, to: [f], label: 'Personal',
    subject: `Notes: ${lec}`,
    text: `Hey ${f.first},\n\nHere are my notes from the last ${lec} lectures. I've attached them as a PDF. Chapter 4 is the most important for the internals.\n\nGood luck for tomorrow!\nAdeela`,
    attach: att('pdf', `${slug(lec)}_Notes`, true),
  };
});
tpl('sentBug', 'primary', () => {
  const t = pick(R('teammate')), f = pick(FEATURES);
  return {
    from: me, to: [t], label: 'Projects',
    subject: `Bug: ${f} breaks on small screens`,
    text: `Hi ${t.first},\n\nI found a layout bug in ${f}: on screens narrower than 400px the toolbar overflows and the primary action gets cut off. Screenshot attached.\n\nI'll pick it up unless someone else already has it.\n\nAdeela`,
    attach: att('png', `${slug(f)}_bug_screenshot`, true),
  };
});
tpl('sentResumeFeedback', 'primary', () => {
  const m = R('mentor')[0];
  return {
    from: me, to: [m], label: 'Placements',
    subject: 'Could you review my resume?',
    text: `Hi ${m.first},\n\nI'm updating my resume before the placement season starts. I've attached the latest version. Could you look at the projects section and tell me if it reads well to a recruiter?\n\nThanks a lot,\nAdeela`,
    attach: att('docx', 'Adeela_Azeez_Resume_v4', true),
  };
});
tpl('sentReimbursement', 'primary', () => {
  const t = pick(R('teammate'));
  return {
    from: me, to: [t], label: 'Finance',
    subject: `Reimbursement request – ₹${int(2, 30) * 100}`,
    text: `Hi ${t.first},\n\nCould you approve my reimbursement for the domain renewal and hosting we used for the demo? I have the invoice and payment proof ready.\n\nThanks,\nAdeela`,
  };
});
tpl('sentTrip', 'primary', () => {
  const f = pick(R('friend')), place = pick(PLACES);
  return {
    from: me, to: [f], label: 'Personal',
    subject: `${place} trip budget`,
    text: `Hey ${f.first},\n\nI did a rough budget for ${place}: transport ₹${int(8, 16) * 100}, stay ₹${int(10, 24) * 100} and food around ₹${int(6, 12) * 100} each. Let me know if that works, then I'll book.\n\nAdeela`,
  };
});

// ---- drafts (unfinished on purpose)
tpl('draftApplication', 'primary', () => {
  const r = pick(R('recruiter'));
  return {
    from: me, to: [r], subject: `Application for ${pick(ROLES)}`,
    text: `Hi ${r.first},\n\nI came across the opening on your careers page and I'm writing to express my interest. I have hands-on experience with React and Node.js from`,
  };
});
tpl('draftCover', 'primary', () => ({
  from: me, to: [], subject: 'Cover letter – draft',
  text: `Dear Hiring Manager,\n\n- Opening: mention the email client project\n- Why this company\n- Internship at ... (fill in)\n\nRegards,\nAdeela`,
}));
tpl('draftStandup', 'primary', () => {
  const [a, b] = shuffle(R('teammate'));
  return {
    from: me, to: [a, b], subject: 'Standup notes',
    text: `Yesterday: finished the API for ${pick(FEATURES)}.\nToday: `,
  };
});
tpl('draftFollowup', 'primary', () => {
  const p = R('professor')[0];
  return {
    from: me, to: [p], subject: 'Re: Feedback on your project synopsis',
    text: `Dear Dr. ${p.last},\n\nThank you for the feedback. I have made the changes you suggested and`,
  };
});
tpl('draftTrip', 'primary', () => ({
  from: me, to: R('friend'), subject: 'Trip plan – who is in?',
  text: `Hey everyone,\n\nThinking of a weekend trip next month. Budget will be around ₹3000 each. Reply with your dates`,
}));

// ---- spam
[
  ['spam1', "🎉 Congratulations! You've won a ₹50,000 gift voucher", 'Dear Winner,\n\nYou have been selected as the lucky winner of our monthly draw. Click the link below within 24 hours to claim your ₹50,000 voucher. Just pay a small processing fee of ₹99.\n\nhttp://claim-now.lucky-rewards-center.biz/win'],
  ['spam2', 'URGENT: Your account will be suspended', 'Dear User,\n\nWe detected unusual activity on your account. Verify your identity within 12 hours or your account will be permanently suspended.\n\nVerify now: http://secure-verify-login.info/account'],
  ['spam3', 'Turn ₹5,000 into ₹1,00,000 in 30 days – guaranteed', 'Hi,\n\nOur private trading group made 20x returns last month. Limited slots left! Join our VIP channel now and start earning from day one. No experience needed.'],
  ['spam1', 'Work from home and earn ₹50,000 weekly', 'Are you a student looking for extra income? Earn ₹50,000 every week just by liking videos online. No investment required, only a registration deposit.\n\nReply YES to get started.'],
  ['spam2', 'Your package could not be delivered', 'We attempted to deliver your parcel but no one was available. Reschedule delivery and pay the ₹35 customs fee here:\n\nhttp://secure-verify-login.info/track'],
  ['spam3', 'Exclusive: this coin will 10x this week 🚀', "Insiders are buying before the announcement. Don't miss out on the next big thing. Buy now before the price explodes!"],
  ['spam1', 'Claim your free iPhone 15 (last 3 left)', 'You are one of 3 people selected today to receive a brand new iPhone 15. Complete a short survey to claim your prize.\n\nhttp://claim-now.lucky-rewards-center.biz/iphone'],
  ['spam2', 'Unusual sign-in detected on your account', 'Someone tried to sign in to your account from an unrecognised device in Ukraine. If this was not you, confirm your password immediately:\n\nhttp://secure-verify-login.info/reset'],
  ['spam3', 'Final notice: unclaimed inheritance of $2,500,000', 'Dear Beneficiary,\n\nI am a barrister representing the estate of a late client who shares your surname. To release the funds I need your bank details and a small legal fee.\n\nKindly reply urgently.'],
  ['spam1', 'Lose 10 kg in 2 weeks with this one weird trick', 'Doctors hate this simple morning drink! Thousands have already lost weight without exercise or dieting. Order today and get a second bottle free.'],
].forEach(([key, subject, text], i) => tpl(`spam${i}`, 'primary', () => ({ from: org[key], subject, text })));

// ------------------------------------------------------------ thread templates
// Each returns 5 candidate turns; who: 'o' = other party, 'm' = me. The builder uses the first 2-5.
const THREADS = {
  sprint: (c) => {
    const n = int(11, 34), f = pick(FEATURES);
    const [t1, t2, t3] = shuffle(FEATURES).slice(0, 3);
    const b = c.extras[0] ?? c.other;
    return {
      subject: `Sprint ${n} planning – ${f}`, labels: ['Work', 'Projects'],
      turns: [
        { who: 'o', text: `Hi team,\n\nFor sprint ${n} we need to agree on scope for ${f}. Current proposal:\n- ${t1}\n- ${t2}\n- ${t3}\n\nPlease add your estimates on the board by ${fut(c.date, 2)}.` },
        { who: 'm', text: `Thanks ${c.other.first}. I can take ${t1}, roughly ${int(2, 4)} days. ${t3} looks risky since it depends on the API changes. Can we push it to next sprint?` },
        { who: 'o', from: b, text: `Agree with Adeela on pushing ${t3}. I'll pick up ${t2} and update the board.` },
        { who: 'o', text: `Sounds good. Board is updated. Planning meeting is on ${fut(c.date, 4)} at 11:00, agenda is in the doc.` },
        { who: 'm', text: `Works for me. I'll have a draft PR for ${t1} ready before the meeting.` },
      ],
    };
  },
  pr: (c) => {
    const n = int(100, 480), f = pick(FEATURES), file = pick(FILES);
    return {
      subject: `Review needed: ${f} (PR #${n})`, labels: ['Projects', 'Work'],
      turns: [
        { who: 'o', text: `Hey Adeela,\n\nI opened PR #${n} for ${f}. Could you review it when you get a chance? The main change is in ${file}. Tests pass locally.` },
        { who: 'm', text: `Had a look. Two comments: 1) the empty-list case isn't handled, it throws on the first render. 2) Can we extract the date formatting into a util? Otherwise looks good.` },
        { who: 'o', text: `Good catches, fixed both and pushed. Please re-review.` },
        { who: 'm', text: `Approved ✅. Merge whenever CI is green.` },
        { who: 'o', text: `Merged. Thanks for the quick turnaround!` },
      ],
    };
  },
  design: (c) => {
    const f = pick(FEATURES);
    return {
      subject: `Design review: ${f} mockups`, labels: ['Work', 'Projects'],
      turns: [
        { who: 'o', text: `Hi Adeela,\n\nI've put together mockups for ${f}. Would love feedback on layout and spacing before we hand off to dev.`, attach: att('png', `${slug(f)}_mockup_v1`) },
        { who: 'm', text: `Looks clean! The action bar feels a bit cramped on mobile. Could we increase the padding and keep the icon sizes the same as the sidebar?` },
        { who: 'o', text: `Good point, I'll adjust and share v2 tomorrow.` },
        { who: 'o', text: `v2 is ready, with more spacing and consistent icons. Let me know what you think.`, attach: att('png', `${slug(f)}_mockup_v2`) },
        { who: 'm', text: `v2 looks great. Go ahead 👍` },
      ],
    };
  },
  reimb: (c) => {
    const thing = pick(['Conference registration', 'Domain renewal', 'Cloud hosting', 'Workshop fee']);
    const amt = int(5, 60) * 100;
    return {
      subject: `Reimbursement – ${thing} (₹${amt})`, labels: ['Finance', 'Work'],
      turns: [
        { who: 'o', text: `Hi Adeela,\n\nTo process your reimbursement for ${thing.toLowerCase()}, finance needs the invoice and the payment proof.` },
        { who: 'm', text: `Sure, sharing both now.`, attach: att('pdf', `Invoice_${slug(thing)}`) },
        { who: 'o', text: `Thanks. Finance says the GST number is missing on the invoice. Can you get a corrected one?` },
        { who: 'm', text: `Got the corrected invoice from the vendor.`, attach: att('pdf', `Invoice_${slug(thing)}_corrected`) },
        { who: 'o', text: `Approved! ₹${amt} will be credited with the next payroll cycle.` },
      ],
    };
  },
  interview: (c) => {
    const role = pick(ROLES);
    const [d1, d2, d3] = [fut(c.date, 3), fut(c.date, 4), fut(c.date, 6)];
    return {
      subject: `Interview schedule – ${role}, ${c.other.company}`, labels: ['Placements'],
      turns: [
        { who: 'o', text: `Hi Adeela,\n\nThanks for applying for the ${role} role at ${c.other.company}. We'd like to schedule your technical interview. Are you available on ${d1} or ${d2}?` },
        { who: 'm', text: `Thank you! I'm available on ${d1} after 2 PM. Please let me know if that works.` },
        { who: 'o', text: `Confirmed for ${d1} at 3:00 PM IST. Joining link: ${meetUrl()}\n\nThe round covers data structures and a short discussion of your projects. Please keep a photo ID handy.`, attach: att('pdf', 'Interview_Guidelines') },
        { who: 'm', text: `Confirmed, thank you. I'll join a few minutes early.` },
        { who: 'o', text: `Apologies, the interviewer has a conflict on ${d1}. Could we move to ${d3} at 3:00 PM instead?` },
      ],
    };
  },
  offer: (c) => {
    const role = pick(ROLES);
    return {
      subject: `Offer of employment – ${role}, ${c.other.company}`, labels: ['Placements'],
      turns: [
        { who: 'o', text: `Dear Adeela,\n\nCongratulations! We are pleased to offer you the position of ${role} at ${c.other.company}. Please sign and return the offer letter by ${fut(c.date, 7)}.`, attach: att('pdf', `Offer_Letter_${slug(c.other.company)}`) },
        { who: 'm', text: `Thank you so much, I'm excited to join! Could you confirm the joining date and location, and whether relocation support is provided?` },
        { who: 'o', text: `Joining date is ${fut(c.date, 45)}, at our ${pick(['Pune', 'Bengaluru', 'Hyderabad'])} office. Relocation assistance of ₹30,000 is provided.\n\nPlease share scanned copies of your degree certificate, ID proof and passport-size photos.` },
        { who: 'm', text: `I've signed the offer letter and can share the documents by tomorrow.`, attach: att('pdf', 'Signed_Offer_Letter_Adeela_Azeez') },
        { who: 'o', text: `Received, thank you. HR will reach out shortly for background verification.` },
      ],
    };
  },
  placement: (c) => {
    const company = pick(COMPANIES);
    return {
      subject: `${company} drive – shortlist & next steps`, labels: ['Placements'],
      turns: [
        { who: 'o', text: `Dear Adeela,\n\nYou have been shortlisted for the online assessment for ${company}. The test is on ${fut(c.date, 4)} at 10:00 AM. Please read the instructions carefully.`, attach: att('pdf', `Assessment_Instructions_${slug(company)}`) },
        { who: 'm', text: `Thank you for the update. Could you confirm whether the assessment is proctored and if a webcam is required?` },
        { who: 'o', text: `Yes, it is proctored. A webcam and a stable internet connection are required. The test link will be shared 30 minutes prior.` },
        { who: 'm', text: `Understood, thanks!` },
        { who: 'o', text: `Results will be announced by ${fut(c.date, 10)}. Best of luck!` },
      ],
    };
  },
  prof: (c) => {
    const topic = pick(PROJECTS);
    return {
      subject: `Project guidance – ${topic}`, labels: ['Projects'],
      turns: [
        { who: 'o', text: `Adeela,\n\nI reviewed your abstract for "${topic}". Please add a related-work section and an evaluation plan. Meet me in my cabin on ${fut(c.date, 2)}.` },
        { who: 'm', text: `Thank you, sir/ma'am. I'll revise the abstract and share the updated draft before then. Would 11 AM work for the meeting?` },
        { who: 'o', text: `11 AM is fine. Bring a description of your dataset too.` },
        { who: 'm', text: `Here is the revised draft with the related work and evaluation plan.`, attach: att('docx', 'Project_Abstract_v2') },
        { who: 'o', text: `Better. I have a few minor comments, we'll discuss them on ${fut(c.date, 5)}.` },
      ],
    };
  },
  weekend: (c) => {
    const place = pick(PLACES);
    const [x, y] = [faker.person.firstName(), faker.person.firstName()];
    return {
      subject: `${place} this weekend?`, labels: ['Personal'],
      turns: [
        { who: 'o', text: `Hey! Are you free on Saturday? Thinking of going to ${place}. ${x} and ${y} are in.` },
        { who: 'm', text: `Saturday works! What time?` },
        { who: 'o', text: `Leave by 8 am? We'll take my car.` },
        { who: 'm', text: `Perfect. I'll bring snacks 😄` },
        { who: 'o', text: `Change of plans, it might rain. Shall we push it to Sunday?` },
      ],
    };
  },
  split: (c) => {
    const total = int(12, 60) * 100, per = Math.round(total / 4);
    return {
      subject: `Splitting the ${pick(['dinner', 'cab', 'movie', 'trip'])} bill`, labels: ['Finance', 'Personal'],
      turns: [
        { who: 'o', text: `Total came to ₹${total}, so ₹${per} each. I paid upfront, can you send your share on UPI?` },
        { who: 'm', text: `Sure, can you share your UPI ID again?` },
        { who: 'o', text: `${c.other.first.toLowerCase()}@okhdfcbank` },
        { who: 'm', text: `Done ✅ ₹${per} sent.`, attach: att('png', 'UPI_Payment_Screenshot') },
        { who: 'o', text: `Received, thanks!` },
      ],
    };
  },
};
const THREAD_ROLE = {
  sprint: 'teammate', pr: 'teammate', design: 'teammate', reimb: 'teammate',
  interview: 'recruiter', offer: 'recruiter', placement: 'placement',
  prof: 'professor', weekend: 'friend', split: 'friend',
};

// --------------------------------------------------------------- build data
const quota = {
  'inbox:primary': 50, 'inbox:promotions': 20, 'inbox:social': 10, 'inbox:updates': 10,
  sent: 25, drafts: 5, spam: 10, trash: 10, archive: 10,
};
let threadSentLeft = 21; // leaves a few slots for standalone sent mail
let threadSeq = 0;
const emails = [];

function buildThread(name, folderIn, startAgo) {
  const kind = THREAD_ROLE[name];
  const other = kind === 'placement' ? org.placement : pick(R(kind));
  const extras = kind === 'teammate' ? shuffle(R('teammate').filter((u) => u !== other)).slice(0, name === 'sprint' ? 2 : 1) : [];
  const c = { other, extras, date: minutesAgo(startAgo) };
  const spec = THREADS[name](c);

  const inKey = folderIn === 'inbox' ? 'inbox:primary' : 'archive';
  const counts = (n) => ({
    o: spec.turns.slice(0, n).filter((t) => t.who === 'o').length,
    m: spec.turns.slice(0, n).filter((t) => t.who === 'm').length,
  });
  let n = Math.min(pick([2, 2, 2, 3, 3, 3, 4, 4, 5]), spec.turns.length);
  while (n >= 2) {
    const k = counts(n);
    if (quota[inKey] >= k.o && quota.sent >= k.m && threadSentLeft >= k.m) break;
    n--;
  }
  if (n < 2) return false;
  const k = counts(n);
  quota[inKey] -= k.o;
  quota.sent -= k.m;
  threadSentLeft -= k.m;

  const tid = ++threadSeq;
  const labelNames = chance(0.75) ? spec.labels.slice(0, chance(0.3) ? 2 : 1) : [];
  const gaps = spec.turns.slice(1, n).map(() => int(25, 60 * 18));
  const total = gaps.reduce((a, b) => a + b, 0);
  const scale = total > startAgo - 10 ? (startAgo - 10) / total : 1;
  const agos = [startAgo];
  for (const g of gaps) agos.push(agos[agos.length - 1] - Math.max(5, Math.round(g * scale)));

  const turns = spec.turns.slice(0, n);
  turns.forEach((t, i) => {
    const mine = t.who === 'm';
    const from = mine ? me : t.from ?? other;
    const first = from.first ?? from.name;
    const sign = mine ? `\n\nRegards,\nAdeela`
      : ['friend', 'family'].includes(from.role) ? `\n\n– ${first}`
      : from.role === 'org' ? `\n\nRegards,\n${from.name}`
      : `\n\nThanks,\n${first}`;
    let text = t.text + sign;
    if (i > 0) {
      const prev = emails[emails.length - 1];
      const quoted = prev.core.split('\n').filter(Boolean).slice(0, 2).map((l) => `> ${l}`).join('\n');
      text += `\n\nOn ${fdatetime(minutesAgo(prev.ago))}, ${prev.from.name} wrote:\n${quoted}`;
    }
    const cc = extras.filter((u) => u !== from);
    emails.push({
      threadKey: tid, from, to: mine ? [other] : [me], cc, bcc: [],
      subject: i === 0 ? spec.subject : `Re: ${spec.subject}`,
      text, core: t.text + sign, ago: agos[i],
      folder: mine ? 'sent' : folderIn, category: 'primary', isDraft: false,
      labelNames: [...labelNames], attach: t.attach ?? null,
      // earlier inbound mail in a thread is read once the thread moves on
      forceRead: !mine && i < n - 1, single: false, seq: emails.length,
    });
  });
  return true;
}

// 20 threads: each template twice; two of them archived, three start recently.
const plan = shuffle([...Object.keys(THREADS), ...Object.keys(THREADS)]);
const archived = new Set(shuffle([...plan.keys()]).slice(0, 2));
const recent = new Set(shuffle([...plan.keys()]).slice(0, 3));
plan.forEach((name, i) => {
  buildThread(name, archived.has(i) ? 'archive' : 'inbox', recent.has(i) ? randomAgo(2, 4) : randomAgo(1, 58));
});

// Standalone emails fill each bucket up to its quota.
const BUCKETS = {
  'inbox:primary': ['placementDrive', 'interviewInvite', 'recruiterOutreach', 'profNote', 'friendMsg', 'teamAnnounce', 'familyMsg'],
  'inbox:promotions': ['amazonDeal', 'swiggyOffer', 'courseraSale', 'hdfcOffer', 'linkedinPremium', 'devWeekly', 'mediumDigest'],
  'inbox:social': ['linkedinInvite', 'linkedinReaction', 'linkedinViews', 'githubFollower', 'mediumFollower'],
  'inbox:updates': ['githubPR', 'githubCI', 'githubIssue', 'bankDebit', 'bankCredit', 'amazonShipped', 'calendarInvite'],
  sent: ['sentApplication', 'sentThanks', 'sentLOR', 'sentTeamUpdate', 'sentNotes', 'sentBug', 'sentResumeFeedback', 'sentReimbursement', 'sentTrip'],
  drafts: ['draftApplication', 'draftCover', 'draftStandup', 'draftFollowup', 'draftTrip'],
  spam: Array.from({ length: 10 }, (_, i) => `spam${i}`),
  trash: ['amazonDeal', 'swiggyOffer', 'devWeekly', 'courseraSale', 'githubCI', 'calendarInvite', 'linkedinViews', 'mediumDigest'],
  archive: ['bankStatement', 'amazonShipped', 'githubPR', 'interviewInvite', 'placementDrive', 'calendarInvite', 'bankCredit', 'sentThanks'],
};
const decks = {};
const nextTemplate = (bucket) => {
  if (!decks[bucket]?.length) decks[bucket] = shuffle(BUCKETS[bucket]);
  return decks[bucket].pop();
};

const inboxSingles = Object.keys(quota).filter((k) => k.startsWith('inbox')).reduce((s, k) => s + quota[k], 0);
const todaySlots = new Set(shuffle([...Array(inboxSingles).keys()]).slice(0, 6));
let inboxSeen = 0;

for (const bucket of Object.keys(quota)) {
  const folder = bucket.startsWith('inbox') ? 'inbox' : bucket;
  while (quota[bucket] > 0) {
    quota[bucket]--;
    const t = T[nextTemplate(bucket)];
    const isToday = folder === 'inbox' && todaySlots.has(inboxSeen++);
    const ago = isToday ? todayAgo() : randomAgo(1, 59);
    const g = t.gen(minutesAgo(ago));
    emails.push({
      threadKey: ++threadSeq, from: g.from, to: g.to ?? [me], cc: g.cc ?? [], bcc: g.bcc ?? [],
      subject: g.subject, text: g.text, core: g.text, ago, folder,
      category: folder === 'inbox' ? bucket.split(':')[1] : folder === 'spam' ? 'primary' : t.cat,
      isDraft: folder === 'drafts', labelNames: g.label ? [g.label] : [],
      attach: folder === 'drafts' ? null : g.attach ?? null,
      important: !!g.important, today: isToday, forceRead: false, single: true, seq: emails.length,
    });
  }
}

// Chronological order; ids and thread ids follow it.
emails.sort((a, b) => b.ago - a.ago || a.seq - b.seq);
const threadIds = new Map();
for (const e of emails) if (!threadIds.has(e.threadKey)) threadIds.set(e.threadKey, threadIds.size + 1);

// ---- per-mailbox state
const total = emails.length;
const inbox = emails.filter((e) => e.folder === 'inbox');

// unread: 40% of the inbox, today's mail first
const unreadPool = [
  ...inbox.filter((e) => e.today),
  ...shuffle(inbox.filter((e) => !e.today && !e.forceRead)),
];
const unread = new Set(unreadPool.slice(0, Math.round(inbox.length * 0.4)));
for (const e of emails) {
  e.read = e.folder === 'inbox' ? !unread.has(e) : e.folder === 'spam' ? chance(0.4) : true;
  e.starred = false;
  e.important = e.important ?? false;
}

// starred: 15% of all mail
const starPool = shuffle(emails.filter((e) =>
  (['inbox', 'sent'].includes(e.folder) && e.category === 'primary') || e.folder === 'archive'));
starPool.slice(0, Math.round(total * 0.15)).forEach((e) => { e.starred = true; });

// important: 10% of all mail, inbox only, hinted templates first
const impPool = shuffle(inbox.filter((e) => e.category === 'primary' || e.category === 'updates'))
  .sort((a, b) => Number(b.important) - Number(a.important));
const impSet = new Set(impPool.slice(0, Math.round(total * 0.1)));
for (const e of emails) e.important = impSet.has(e);

// labels on ~30% of mail
const labelable = emails.filter((e) => ['inbox', 'sent', 'archive'].includes(e.folder));
const targetLabeled = Math.round(total * 0.3);
const hinted = shuffle(labelable.filter((e) => e.labelNames.length));
hinted.slice(targetLabeled).forEach((e) => { e.labelNames = []; });
let labeled = Math.min(hinted.length, targetLabeled);
for (const e of shuffle(labelable.filter((e) => !e.labelNames.length))) {
  if (labeled >= targetLabeled) break;
  e.labelNames = [pick(['Work', 'Personal', 'Projects'])];
  labeled++;
}
for (const e of labelable) {
  if (e.labelNames.length === 1 && chance(0.1)) {
    const extra = pick(LABELS.map((l) => l[0]).filter((n) => n !== e.labelNames[0]));
    e.labelNames.push(extra);
  }
}

// attachments: ~15 (those the body refers to are always kept)
const cands = emails.filter((e) => e.attach);
const must = cands.filter((e) => e.attach.mentioned);
const optional = shuffle(cands.filter((e) => !e.attach.mentioned));
const keep = new Set([...must, ...optional.slice(0, Math.max(0, 15 - must.length))]);
for (const e of emails) if (!keep.has(e)) e.attach = null;

// -------------------------------------------------------------- write to DB
const seed = db.transaction(() => {
  for (const t of ['mailbox_item_labels', 'attachments', 'email_recipients', 'mailbox_items', 'labels', 'emails', 'users']) {
    db.exec(`DELETE FROM ${t}`);
  }
  db.exec("DELETE FROM sqlite_sequence");

  const insUser = db.prepare('INSERT INTO users (id, name, email, avatar_color, created_at) VALUES (?, ?, ?, ?, ?)');
  const created = sqlDate(minutesAgo(90 * 24 * 60));
  for (const u of users) insUser.run(u.id, u.name, u.email, u.avatar_color, created);

  const insLabel = db.prepare('INSERT INTO labels (owner_user_id, name, color) VALUES (?, ?, ?)');
  const labelId = {};
  for (const [name, color] of LABELS) labelId[name] = insLabel.run(me.id, name, color).lastInsertRowid;

  const insEmail = db.prepare(`INSERT INTO emails
    (thread_id, from_user_id, subject, body_html, body_text, snippet, sent_at, is_draft)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);
  const insRcpt = db.prepare('INSERT INTO email_recipients (email_id, user_id, type) VALUES (?, ?, ?)');
  const insItem = db.prepare(`INSERT INTO mailbox_items
    (email_id, owner_user_id, folder, is_read, is_starred, is_important, category)
    VALUES (?, ?, ?, ?, ?, ?, ?)`);
  const insItemLabel = db.prepare('INSERT INTO mailbox_item_labels (mailbox_item_id, label_id) VALUES (?, ?)');
  const insAtt = db.prepare('INSERT INTO attachments (email_id, filename, mime_type, size_bytes) VALUES (?, ?, ?, ?)');

  for (const e of emails) {
    const snippet = (e.core ?? e.text).replace(/\s+/g, ' ').trim().slice(0, 120);
    const emailId = insEmail.run(
      threadIds.get(e.threadKey), e.from.id, e.subject, toHtml(e.text), e.text, snippet,
      sqlDate(minutesAgo(e.ago)), e.isDraft ? 1 : 0
    ).lastInsertRowid;
    for (const [type, list] of [['to', e.to], ['cc', e.cc], ['bcc', e.bcc]]) {
      for (const u of list) insRcpt.run(emailId, u.id, type);
    }
    const itemId = insItem.run(
      emailId, me.id, e.folder, e.read ? 1 : 0, e.starred ? 1 : 0, e.important ? 1 : 0, e.category
    ).lastInsertRowid;
    for (const name of e.labelNames) insItemLabel.run(itemId, labelId[name]);
    if (e.attach) insAtt.run(emailId, e.attach.filename, e.attach.mime_type, e.attach.size_bytes);
  }
});
seed();

// ------------------------------------------------------------------ report
const q = (sql) => db.prepare(sql).all();
console.log(`Seeded ${users.length} users, ${LABELS.length} labels, ${emails.length} emails (as of ${sqlDate(NOW)} UTC)\n`);
console.log('Folder counts for Adeela (user 1):');
for (const r of q(`SELECT folder, COUNT(*) n, SUM(is_read = 0) unread FROM mailbox_items
                   WHERE owner_user_id = 1 GROUP BY folder ORDER BY n DESC`)) {
  console.log(`  ${r.folder.padEnd(8)} ${String(r.n).padStart(3)}  (${r.unread} unread)`);
}
console.log('Inbox by category:');
for (const r of q(`SELECT category, COUNT(*) n FROM mailbox_items WHERE owner_user_id = 1 AND folder = 'inbox' GROUP BY category ORDER BY n DESC`)) {
  console.log(`  ${r.category.padEnd(10)} ${r.n}`);
}
const one = (sql) => Object.values(db.prepare(sql).get())[0];
console.log(
  `Totals: starred ${one('SELECT COUNT(*) FROM mailbox_items WHERE is_starred')}, ` +
  `important ${one('SELECT COUNT(*) FROM mailbox_items WHERE is_important')}, ` +
  `labelled ${one('SELECT COUNT(DISTINCT mailbox_item_id) FROM mailbox_item_labels')}, ` +
  `attachments ${one('SELECT COUNT(*) FROM attachments')}, ` +
  `multi-message threads ${one('SELECT COUNT(*) FROM (SELECT thread_id FROM emails GROUP BY thread_id HAVING COUNT(*) > 1)')}, ` +
  `emails today ${one("SELECT COUNT(*) FROM emails WHERE date(sent_at) = date('" + sqlDate(NOW) + "')")}`
);
db.close();

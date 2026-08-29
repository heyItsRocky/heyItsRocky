import fs from 'node:fs';

const username = process.env.GITHUB_ACTOR || 'heyItsRocky';
const token = process.env.GITHUB_TOKEN;

if (!token) throw new Error('GITHUB_TOKEN is required');

const query = `query($login:String!){user(login:$login){contributionsCollection{contributionCalendar{totalContributions weeks{contributionDays{date contributionCount}}}}}}`;

const response = await fetch('https://api.github.com/graphql', {
  method: 'POST',
  headers: {
    authorization: `bearer ${token}`,
    'content-type': 'application/json',
    'user-agent': 'heyItsRocky-profile-heatmap'
  },
  body: JSON.stringify({ query, variables: { login: username } })
});

if (!response.ok) {
  throw new Error(`GitHub GraphQL failed: ${response.status}`);
}

const json = await response.json();
if (json.errors) throw new Error(JSON.stringify(json.errors));

const calendar = json.data?.user?.contributionsCollection?.contributionCalendar;
if (!calendar) throw new Error('GitHub contribution calendar was not returned');

const { weeks, totalContributions: total } = calendar;
const days = weeks.flatMap(({ contributionDays }) => contributionDays);
const max = Math.max(1, ...days.map(({ contributionCount }) => contributionCount));

const level = count => {
  if (count === 0) return 0;
  if (count <= max * 0.25) return 1;
  if (count <= max * 0.5) return 2;
  if (count <= max * 0.75) return 3;
  return 4;
};

const colors = ['#0d1117', '#064e3b', '#047857', '#10b981', '#34d399'];
const cell = 10;
const gap = 3;
const left = 40;
const top = 42;
const rows = 7;
const width = left + weeks.length * (cell + gap) + 24;
const height = top + rows * (cell + gap) + 28;

const rects = weeks.map((week, x) =>
  week.contributionDays.map((day, y) => {
    const px = left + x * (cell + gap);
    const py = top + y * (cell + gap);
    const noun = day.contributionCount === 1 ? 'contribution' : 'contributions';
    return `<rect x="${px}" y="${py}" width="${cell}" height="${cell}" rx="2" fill="${colors[level(day.contributionCount)]}"><title>${day.date}: ${day.contributionCount} ${noun}</title></rect>`;
  }).join('')
).join('');

const labels = [
  ['Sun', top + 8],
  ['Tue', top + 29],
  ['Thu', top + 50],
  ['Sat', top + 71]
].map(([label, y]) =>
  `<text x="${left - 24}" y="${y}" fill="#7d8590" font-family="system-ui,sans-serif" font-size="8">${label}</text>`
).join('');

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="t d"><title id="t">GitHub contribution activity</title><desc id="d">${total} contributions in the last year.</desc><rect width="100%" height="100%" rx="12" fill="#0d1117"/><text x="16" y="22" fill="#e6edf3" font-family="system-ui,sans-serif" font-size="13" font-weight="600">${total} contributions in the last year</text>${labels}${rects}</svg>`;

fs.mkdirSync('dist', { recursive: true });
fs.writeFileSync('dist/github-jet.svg', svg);
console.log(`Generated contribution heatmap for ${username}: ${total} contributions`);

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

if (!response.ok) throw new Error(`GitHub GraphQL failed: ${response.status}`);
const json = await response.json();
if (json.errors) throw new Error(JSON.stringify(json.errors));

const weeks = json.data.user.contributionsCollection.contributionCalendar.weeks;
const total = json.data.user.contributionsCollection.contributionCalendar.totalContributions;
const days = weeks.flatMap(w => w.contributionDays);
const max = Math.max(1, ...days.map(d => d.contributionCount));

const level = count => count === 0 ? 0 : count <= max * .25 ? 1 : count <= max * .5 ? 2 : count <= max * .75 ? 3 : 4;
const colors = ['#161b22', '#0e4429', '#006d32', '#26a641', '#39d353'];
const cell = 10, gap = 3, left = 34, top = 38;
const width = left + weeks.length * (cell + gap) + 20;
const height = 92;

const rects = weeks.map((week, x) => week.contributionDays.map((day, y) => {
  const px = left + x * (cell + gap);
  const py = top + y * (cell + gap);
  return `<rect x="${px}" y="${py}" width="${cell}" height="${cell}" rx="2" fill="${colors[level(day.contributionCount)]}"><title>${day.date}: ${day.contributionCount} contribution${day.contributionCount === 1 ? '' : 's'}</title></rect>`;
}).join('')).join('');

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="t d"><title id="t">GitHub contribution activity</title><desc id="d">${total} contributions in the last year.</desc><rect width="100%" height="100%" rx="12" fill="#0d1117"/><text x="16" y="22" fill="#e6edf3" font-family="system-ui,sans-serif" font-size="13" font-weight="600">${total} contributions in the last year</text>${rects}<text x="${left - 18}" y="${top + 8}" fill="#7d8590" font-family="system-ui,sans-serif" font-size="8">Sun</text><text x="${left - 18}" y="${top + 29}" fill="#7d8590" font-family="system-ui,sans-serif" font-size="8">Tue</text><text x="${left - 18}" y="${top + 50}" fill="#7d8590" font-family="system-ui,sans-serif" font-size="8">Thu</text><text x="${left - 18}" y="${top + 71}" fill="#7d8590" font-family="system-ui,sans-serif" font-size="8">Sat</text></svg>`;

fs.mkdirSync('dist', { recursive: true });
fs.writeFileSync('dist/github-jet.svg', svg);
console.log(`Generated contribution heatmap for ${username}: ${total} contributions`);

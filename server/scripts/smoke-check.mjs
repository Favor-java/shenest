import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, mkdir, rm, copyFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'node:net';

const serverDirectory = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const temporary = await mkdtemp(resolve(tmpdir(), 'shenest-smoke-'));
const uploads = resolve(temporary, 'uploads');
await mkdir(uploads);
const listener = createServer();
await new Promise(resolve => listener.listen(0, '127.0.0.1', resolve));
const port = listener.address().port;
await new Promise(resolve => listener.close(resolve));
const origin = `http://localhost:${port}`;
const database = resolve(temporary, 'test.db');
let process;
let log = '';
let checks = 0;

async function start(seed = true, databasePath = database) {
  log = '';
  process = spawn(globalThis.process.env.JAVA_BIN || 'java', [
    '-XX:TieredStopAtLevel=1', '-jar', resolve(serverDirectory, 'target/shenest-server-1.0.0.jar'),
    `--server.port=${port}`, `--spring.datasource.url=jdbc:sqlite:${databasePath}`,
    `--shenest.upload-dir=${uploads}`, `--shenest.seed=${seed}`,
    `--shenest.seed-base-url=${origin}`, '--shenest.jwt-secret=smoke-check-secret',
    '--spring.config.import=optional:classpath:smoke-unused.properties',
  ], { cwd: serverDirectory, stdio: ['ignore', 'pipe', 'pipe'] });
  let error;
  process.on('error', e => { error = e; });
  for (const stream of [process.stdout, process.stderr]) stream.on('data', data => { log += data; });
  const deadline = Date.now() + 120000;
  while (Date.now() < deadline) {
    if (error) throw error;
    if (process.exitCode !== null) throw new Error(`Server exited: ${log}`);
    if (log.includes('Started SheNestApplication') && (!seed || log.includes('SheNest demo seed complete.'))) {
      const response = await fetch(`${origin}/api/health`);
      if (response.ok) {
        console.log(`Backend ready (${seed ? 'demo seed' : 'existing database'}).`);
        return;
      }
    }
    await new Promise(resolve => setTimeout(resolve, 150));
  }
  throw new Error(`Server did not become ready: ${log}`);
}

async function stop() {
  if (!process || process.exitCode !== null) return;
  await new Promise(resolve => { process.once('exit', resolve); process.kill('SIGTERM'); });
}

async function request(path, { method = 'GET', body, token, status = 200 } = {}) {
  const form = body instanceof FormData;
  const response = await fetch(`${origin}/api${path}`, {
    method,
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(!form && body ? { 'Content-Type': 'application/json' } : {}) },
    body: form ? body : body ? JSON.stringify(body) : undefined,
  });
  const data = await response.json();
  assert.equal(response.status, status, `${method} ${path}: ${JSON.stringify(data)}`);
  checks++;
  return data;
}

try {
  await start();
  assert.equal((await request('/health')).ok, true);
  const login = email => request('/auth/login', { method: 'POST', body: { email, password: 'password123' } });
  const renter = await login('ada@shenest.test');
  const landlord = await login('landlord@shenest.test');
  const other = await login('tomi.landlord@shenest.test');
  const admin = await login('admin@shenest.test');
  assert.equal(renter.user.password, undefined);
  await request('/auth/login', { method: 'POST', body: { email: renter.user.email, password: 'wrong' }, status: 401 });
  const registration = { name: 'Smoke User', email: ' SMOKE@shenest.test ', password: 'password123' };
  const newcomer = await request('/auth/register', { method: 'POST', body: registration, status: 201 });
  assert.equal(newcomer.user.email, 'smoke@shenest.test');
  await request('/auth/register', { method: 'POST', body: registration, status: 409 });
  await request('/auth/register', { method: 'POST', body: { ...registration, email: 'admin2@test', role: 'ADMIN' }, status: 400 });
  await request('/auth/register', { method: 'POST', body: { ...registration, password: 'short' }, status: 400 });
  await request('/favorites', { status: 401 });
  await request('/favorites', { token: 'invalid', status: 401 });
  // HTML pages are rendered on the server, including guest and permission states.
  for (const path of ['/', '/properties', '/properties/1', '/roommates', '/login', '/register', '/favorites', '/account', '/landlord', '/admin', '/properties/new', '/messages/1', '/privacy', '/terms']) {
    const page = await fetch(`${origin}${path}`);
    assert.equal(page.status, 200, path);
    const markup = await page.text();
    assert.ok(markup.includes('<title>SheNest</title>'), path);
    assert.ok(markup.includes('<main'), path);
    assert.ok(!markup.includes('th:') && !markup.includes('/src/main.jsx'), path);
    assert.ok(markup.includes('href="/privacy"') && markup.includes('href="/terms"'), path);
    assert.ok(markup.includes('id="main-content"'), path);
    checks++;
  }
  assert.equal((await fetch(`${origin}/missing-page`)).status, 404);
  assert.equal((await fetch(`${origin}/css/styles.css`)).status, 200);
  assert.equal((await fetch(`${origin}/js/app.js`)).status, 200);
  checks += 3;
  const loginPage = await fetch(`${origin}/login`);
  let cookie = loginPage.headers.get('set-cookie').split(';')[0];
  const csrf = (await loginPage.text()).match(/name="csrf-token"[^>]*content="([^"]+)"/)[1];
  const denied = await fetch(`${origin}/ui/login`, {method: 'POST', headers: {'Content-Type': 'application/json', Cookie: cookie}, body: JSON.stringify({email: 'ada@shenest.test', password: 'password123'})});
  assert.equal(denied.status, 403);
  const sessionLogin = await fetch(`${origin}/ui/login`, {method: 'POST', headers: {'Content-Type': 'application/json', Cookie: cookie, 'X-CSRF-Token': csrf}, body: JSON.stringify({email: 'ada@shenest.test', password: 'password123'})});
  assert.equal(sessionLogin.status, 200);
  cookie = sessionLogin.headers.get('set-cookie').split(';')[0];
  const accountPage = await fetch(`${origin}/account`, {headers: {Cookie: cookie}});
  assert.ok((await accountPage.text()).includes('Ada Nwosu'));
  const logout = await fetch(`${origin}/ui/logout`, {method: 'POST', headers: {Cookie: cookie, 'X-CSRF-Token': csrf}});
  assert.equal(logout.status, 200);
  const loggedOut = await fetch(`${origin}/account`, {headers: {Cookie: cookie}});
  assert.ok((await loggedOut.text()).includes('Log in to see your profile.'));
  checks += 5;
  assert.equal((await request('/properties')).length, 8);
  assert.equal((await request('/properties?search=Lekki&type=Studio')).length, 1);
  const listing = { title: 'Smoke apartment', description: 'Test description', location: 'Lagos', price: '100000', type: 'Apartment' };
  await request('/properties', { method: 'POST', body: listing, token: renter.token, status: 403 });
  await request('/properties', { method: 'POST', body: { ...listing, price: -1 }, token: landlord.token, status: 400 });
  const home = await request('/properties', { method: 'POST', body: listing, token: landlord.token, status: 201 });
  assert.equal(home.owner_id, landlord.user.id);
  assert.equal(home.verified, 0);
  assert.ok((await request('/properties/mine', { token: landlord.token })).some(p => p.id === home.id));
  await request('/properties/pending', { token: renter.token, status: 403 });
  assert.ok((await request('/properties/pending', { token: admin.token })).some(p => p.id === home.id));
  await request(`/properties/${home.id}/verify`, { method: 'PATCH', token: landlord.token, status: 403 });
  assert.equal((await request(`/properties/${home.id}/verify`, { method: 'PATCH', token: admin.token })).verified, 1);
  await request('/properties/999999', { status: 404 });
  await request('/properties/999999/verify', { method: 'PATCH', token: admin.token, status: 404 });
  assert.equal((await request(`/favorites/${home.id}`, { method: 'POST', token: renter.token })).saved, true);
  assert.ok((await request('/favorites', { token: renter.token })).some(p => p.id === home.id));
  assert.equal((await request(`/favorites/${home.id}`, { method: 'POST', token: renter.token })).saved, false);
  await request('/favorites/999999', { method: 'POST', token: renter.token, status: 404 });
  const booking = await request('/bookings', { method: 'POST', token: renter.token, body: { propertyId: home.id, message: 'Viewing please' }, status: 201 });
  assert.equal(booking.status, 'PENDING');
  assert.ok((await request('/bookings/mine', { token: renter.token })).some(b => b.id === booking.id));
  assert.ok((await request('/bookings/landlord', { token: landlord.token })).some(b => b.id === booking.id && b.renter_name));
  await request(`/bookings/${booking.id}/status`, { method: 'PATCH', token: other.token, body: { status: 'APPROVED' }, status: 404 });
  await request(`/bookings/${booking.id}/status`, { method: 'PATCH', token: landlord.token, body: { status: 'INVALID' }, status: 400 });
  assert.equal((await request(`/bookings/${booking.id}/status`, { method: 'PATCH', token: landlord.token, body: { status: 'approved' } })).status, 'APPROVED');
  await request('/bookings', { method: 'POST', token: landlord.token, body: { propertyId: home.id }, status: 400 });
  await request('/bookings', { method: 'POST', token: renter.token, body: { propertyId: 999999 }, status: 404 });
  await request(`/reviews/${home.id}`, { method: 'POST', token: renter.token, body: { rating: 5, comment: 'Great' }, status: 201 });
  assert.equal((await request(`/reviews/${home.id}`))[0].rating, 5);
  for (const rating of [0, 6, 'oops', 2.5]) await request(`/reviews/${home.id}`, { method: 'POST', token: renter.token, body: { rating }, status: 400 });
  await request('/reviews/999999', { method: 'POST', token: renter.token, body: { rating: 5 }, status: 404 });
  const profile = { bio: 'Calm', location: 'Lagos', budget: '500000', moveIn: 'October', lifestyle: 'Quiet' };
  const firstProfile = await request('/roommates/me', { method: 'PUT', token: newcomer.token, body: profile });
  const changedProfile = await request('/roommates/me', { method: 'PUT', token: newcomer.token, body: { ...profile, bio: 'Updated' } });
  assert.equal(firstProfile.id, changedProfile.id);
  assert.ok((await request('/roommates?location=Lagos')).some(p => p.bio === 'Updated' && p.name === 'Smoke User'));
  const message = await request(`/messages/${landlord.user.id}`, { method: 'POST', token: renter.token, body: { text: ' Hello ' }, status: 201 });
  assert.equal(message.text, 'Hello');
  assert.ok((await request(`/messages/${renter.user.id}`, { token: landlord.token })).some(m => m.id === message.id && m.sender_name === renter.user.name));
  assert.equal((await request(`/messages/${landlord.user.id}`, { token: newcomer.token })).length, 0);
  await request(`/messages/${renter.user.id}`, { method: 'POST', token: renter.token, body: { text: 'Hello' }, status: 400 });
  await request('/messages/999999', { method: 'POST', token: renter.token, body: { text: 'Hello' }, status: 404 });
  await request(`/messages/${landlord.user.id}`, { method: 'POST', token: renter.token, body: { text: ' ' }, status: 400 });
  const form = new FormData();
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aVWQAAAAASUVORK5CYII=', 'base64');
  form.append('image', new Blob([png], { type: 'image/png' }), 'image.png');
  await request('/uploads/property-image', { method: 'POST', token: renter.token, body: form, status: 403 });
  const upload = await request('/uploads/property-image', { method: 'POST', token: landlord.token, body: form, status: 201 });
  const downloaded = await fetch(upload.url);
  assert.equal(downloaded.status, 200);
  assert.deepEqual(Buffer.from(await downloaded.arrayBuffer()), png);
  const invalid = new FormData();
  invalid.append('image', new Blob(['bad'], { type: 'text/plain' }), 'bad.txt');
  await request('/uploads/property-image', { method: 'POST', token: landlord.token, body: invalid, status: 400 });
  const oversized = new FormData();
  oversized.append('image', new Blob([new Uint8Array(5 * 1024 * 1024 + 1)], { type: 'image/png' }), 'large.png');
  await request('/uploads/property-image', { method: 'POST', token: landlord.token, body: oversized, status: 400 });
  await request('/uploads/property-image', { method: 'POST', token: landlord.token, body: new FormData(), status: 400 });
  const cors = await fetch(`${origin}/api/health`, { method: 'OPTIONS', headers: { Origin: 'http://localhost:5173', 'Access-Control-Request-Method': 'GET' } });
  assert.equal(cors.headers.get('access-control-allow-origin'), 'http://localhost:5173');

  // Reports must not expose another conversation, and only admins may read evidence.
  const reportBody = { targetType: 'USER', targetId: landlord.user.id, reason: 'HARASSMENT', details: 'Test safety concern <script>alert(1)</script>' };
  await request('/reports', { method: 'POST', body: reportBody, status: 401 });
  await request('/reports', { method: 'POST', token: renter.token, body: { ...reportBody, targetType: 'INVALID' }, status: 400 });
  await request('/reports', { method: 'POST', token: renter.token, body: { ...reportBody, targetId: renter.user.id }, status: 400 });
  await request('/reports', { method: 'POST', token: renter.token, body: { ...reportBody, targetId: 999999 }, status: 404 });
  await request('/reports', { method: 'POST', token: renter.token, body: { ...reportBody, reason: 'INVALID' }, status: 400 });
  await request('/reports', { method: 'POST', token: renter.token, body: { ...reportBody, details: ' ' }, status: 400 });
  await request('/reports', { method: 'POST', token: renter.token, body: { ...reportBody, details: 'a'.repeat(2001) }, status: 400 });
  const report = await request('/reports', { method: 'POST', token: renter.token, body: reportBody, status: 201 });
  await request('/reports', { method: 'POST', token: renter.token, body: reportBody, status: 409 });
  const ownReports = await request('/reports/mine', { token: renter.token });
  assert.equal(ownReports[0].id, report.id);
  assert.equal(ownReports[0].context, undefined);
  assert.equal((await request('/reports/mine', { token: landlord.token })).length, 0);
  await request('/admin/reports', { status: 401 });
  await request('/admin/reports', { token: renter.token, status: 403 });
  const evidence = await request('/admin/reports', { token: admin.token });
  assert.equal(evidence[0].details, reportBody.details);
  assert.ok(evidence[0].context.includes(landlord.user.name));
  const messageReport = { ...reportBody, targetType: 'MESSAGE', targetId: message.id };
  await request('/reports', { method: 'POST', token: newcomer.token, body: messageReport, status: 404 });
  await request('/reports', { method: 'POST', token: renter.token, body: messageReport, status: 404 });
  await request('/reports', { method: 'POST', token: landlord.token, body: messageReport, status: 201 });
  const listingReport = { ...reportBody, targetType: 'PROPERTY', targetId: home.id };
  await request('/reports', { method: 'POST', token: landlord.token, body: listingReport, status: 400 });
  await request('/reports', { method: 'POST', token: renter.token, body: listingReport, status: 201 });
  await request(`/admin/reports/${report.id}`, { method: 'PATCH', token: renter.token, body: { status: 'REVIEWED', note: 'Checked' }, status: 403 });
  await request(`/admin/reports/${report.id}`, { method: 'PATCH', token: admin.token, body: { status: 'REVIEWED' }, status: 400 });
  await request(`/admin/reports/${report.id}`, { method: 'PATCH', token: admin.token, body: { status: 'INVALID', note: 'Checked' }, status: 400 });
  await request('/admin/reports/999999', { method: 'PATCH', token: admin.token, body: { status: 'REVIEWED', note: 'Checked' }, status: 404 });
  await request(`/admin/reports/${report.id}`, { method: 'PATCH', token: admin.token, body: { status: 'REVIEWED', note: 'Private decision note' } });
  await request(`/admin/reports/${report.id}`, { method: 'PATCH', token: admin.token, body: { status: 'DISMISSED', note: 'Changed' }, status: 409 });
  assert.equal((await request('/reports/mine', { token: renter.token }))[0].review_note, undefined);

  await request('/blocks', { status: 401 });
  await request(`/blocks/${landlord.user.id}`, { method: 'PUT', status: 401 });
  await request(`/blocks/${renter.user.id}`, { method: 'PUT', token: renter.token, status: 400 });
  await request('/blocks/999999', { method: 'PUT', token: renter.token, status: 404 });
  await request(`/blocks/${landlord.user.id}`, { method: 'PUT', token: renter.token });
  await request(`/blocks/${landlord.user.id}`, { method: 'PUT', token: renter.token });
  assert.equal((await request('/blocks', { token: renter.token })).length, 1);
  assert.equal((await request('/blocks', { token: landlord.token })).length, 0);
  await request(`/messages/${landlord.user.id}`, { method: 'POST', token: renter.token, body: { text: 'Blocked' }, status: 403 });
  await request(`/messages/${renter.user.id}`, { method: 'POST', token: landlord.token, body: { text: 'Blocked' }, status: 403 });
  await request('/bookings', { method: 'POST', token: renter.token, body: { propertyId: home.id, message: 'Blocked' }, status: 403 });
  assert.ok((await request(`/messages/${landlord.user.id}`, { token: renter.token })).some(m => m.id === message.id));
  await request(`/blocks/${renter.user.id}`, { method: 'PUT', token: landlord.token });
  await request(`/blocks/${landlord.user.id}`, { method: 'DELETE', token: renter.token });
  await request(`/messages/${landlord.user.id}`, { method: 'POST', token: renter.token, body: { text: 'Still blocked by recipient' }, status: 403 });
  await request(`/blocks/${renter.user.id}`, { method: 'DELETE', token: landlord.token });
  await request(`/messages/${landlord.user.id}`, { method: 'POST', token: renter.token, body: { text: 'Contact restored' }, status: 201 });
  await request(`/blocks/${landlord.user.id}`, { method: 'PUT', token: renter.token });

  // Browser-session writes keep CSRF protection, including report and block endpoints.
  const safetyLoginPage = await fetch(`${origin}/login`);
  const safetyCookie = safetyLoginPage.headers.get('set-cookie').split(';')[0];
  const safetyCsrf = (await safetyLoginPage.text()).match(/name="csrf-token"[^>]*content="([^"]+)"/)[1];
  const safetyLogin = await fetch(`${origin}/ui/login`, { method: 'POST', headers: { 'Content-Type': 'application/json', Cookie: safetyCookie, 'X-CSRF-Token': safetyCsrf }, body: JSON.stringify({ email: renter.user.email, password: 'password123' }) });
  const loggedInCookie = safetyLogin.headers.get('set-cookie').split(';')[0];
  const blockedChat = await fetch(`${origin}/messages/${landlord.user.id}`, { headers: { Cookie: loggedInCookie } });
  const blockedMarkup = await blockedChat.text();
  assert.ok(blockedMarkup.includes('Unblock member') && !blockedMarkup.includes('data-message-recipient'));
  const reportPage = await fetch(`${origin}/report?type=PROPERTY&id=${home.id}`, { headers: { Cookie: loggedInCookie } });
  assert.equal(reportPage.status, 200);
  assert.ok((await reportPage.text()).includes('id="report-details"'));
  for (const [path, method, body] of [[`/blocks/${landlord.user.id}`, 'DELETE'], ['/reports', 'POST', reportBody]]) {
    const deniedWrite = await fetch(`${origin}/api${path}`, { method, headers: { Cookie: loggedInCookie, 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
    assert.equal(deniedWrite.status, 403);
    checks++;
  }
  const adminLogin = await fetch(`${origin}/ui/login`, { method: 'POST', headers: { 'Content-Type': 'application/json', Cookie: loggedInCookie, 'X-CSRF-Token': safetyCsrf }, body: JSON.stringify({ email: admin.user.email, password: 'password123' }) });
  const adminCookie = adminLogin.headers.get('set-cookie').split(';')[0];
  const adminPage = await fetch(`${origin}/admin`, { headers: { Cookie: adminCookie } });
  const adminMarkup = await adminPage.text();
  assert.ok(adminMarkup.includes('Safety reports') && adminMarkup.includes('Private decision note'));
  assert.ok(adminMarkup.includes('&lt;script&gt;') && !adminMarkup.includes('<script>alert(1)</script>'));
  checks += 3;
  await stop();
  await start();
  assert.equal((await request('/properties')).length, 9);
  assert.equal((await request(`/properties/${home.id}`)).title, listing.title);
  assert.equal((await request('/bookings/mine', { token: renter.token })).find(b => b.id === booking.id).status, 'APPROVED');
  assert.ok((await request('/roommates')).some(p => p.user_id === newcomer.user.id && p.bio === 'Updated'));
  assert.equal((await request('/roommates')).length, 6);
  assert.equal((await request(`/reviews/${home.id}`)).length, 1);
  assert.equal((await request('/blocks', { token: renter.token }))[0].id, landlord.user.id);
  assert.equal((await request('/reports/mine', { token: renter.token })).find(r => r.id === report.id).status, 'REVIEWED');
  await request(`/messages/${landlord.user.id}`, { method: 'POST', token: renter.token, body: { text: 'Still blocked after restart' }, status: 403 });
  await stop();
  // If a local database exists, verify legacy bcrypt accounts using an isolated copy.
  const legacyDatabase = resolve(temporary, 'legacy.db');
  try {
    await copyFile(resolve(serverDirectory, 'data/shenest.db'), legacyDatabase);
    await start(false, legacyDatabase);
    await request('/properties');
    const legacyLogin = await fetch(`${origin}/api/auth/login`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'ada@shenest.test', password: 'password123' }),
    });
    assert.ok([200, 401].includes(legacyLogin.status));
    checks++;
    console.log(legacyLogin.ok
      ? 'Existing SQLite data and legacy bcrypt login verified on a copy.'
      : 'Existing SQLite data loaded; no matching demo credentials for the optional bcrypt check.');
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  console.log(`Passed ${checks} API/HTML smoke checks, browser sessions/CSRF, persistence and repeatable seeding.`);
} catch (error) {
  console.error(log.slice(-6000));
  throw error;
} finally {
  await stop();
  await rm(temporary, { recursive: true, force: true });
}

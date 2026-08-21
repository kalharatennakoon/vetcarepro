import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { authorize, adminOnly, vetOrAdmin, adminOrReceptionist, staffOnly } from '../src/middleware/roleCheck.js';

// authorize() and its shorthands only ever read req.user.role and call
// res.status/json/next - no DB, no real Express app needed to exercise them.
const mockReq = (role) => (role === null ? {} : { user: { role } });
const mockRes = () => {
  const res = { statusCode: null, body: null };
  res.status = (code) => { res.statusCode = code; return res; };
  res.json = (body) => { res.body = body; return res; };
  return res;
};

const run = (middleware, role) => {
  const req = mockReq(role);
  const res = mockRes();
  let nextCalled = false;
  middleware(req, res, () => { nextCalled = true; });
  return { res, nextCalled };
};

describe('authorize()', () => {
  test('401s when there is no req.user at all (authenticate middleware never ran)', () => {
    const { res, nextCalled } = run(authorize('admin'), null);
    assert.equal(res.statusCode, 401);
    assert.equal(nextCalled, false);
  });

  test('403s when the role is not in the allowed list', () => {
    const { res, nextCalled } = run(authorize('admin'), 'receptionist');
    assert.equal(res.statusCode, 403);
    assert.equal(nextCalled, false);
  });

  test('calls next() when the role is allowed', () => {
    const { res, nextCalled } = run(authorize('admin', 'veterinarian'), 'veterinarian');
    assert.equal(nextCalled, true);
    assert.equal(res.statusCode, null);
  });
});

describe('role shorthands match docs/rbac.md', () => {
  test('adminOnly allows admin, rejects everyone else', () => {
    assert.equal(run(adminOnly, 'admin').nextCalled, true);
    assert.equal(run(adminOnly, 'veterinarian').nextCalled, false);
    assert.equal(run(adminOnly, 'receptionist').nextCalled, false);
  });

  test('vetOrAdmin allows veterinarian and admin, rejects receptionist', () => {
    assert.equal(run(vetOrAdmin, 'veterinarian').nextCalled, true);
    assert.equal(run(vetOrAdmin, 'admin').nextCalled, true);
    assert.equal(run(vetOrAdmin, 'receptionist').nextCalled, false);
  });

  test('adminOrReceptionist allows admin and receptionist, rejects veterinarian', () => {
    assert.equal(run(adminOrReceptionist, 'admin').nextCalled, true);
    assert.equal(run(adminOrReceptionist, 'receptionist').nextCalled, true);
    assert.equal(run(adminOrReceptionist, 'veterinarian').nextCalled, false);
  });

  test('staffOnly allows all three staff roles', () => {
    assert.equal(run(staffOnly, 'admin').nextCalled, true);
    assert.equal(run(staffOnly, 'veterinarian').nextCalled, true);
    assert.equal(run(staffOnly, 'receptionist').nextCalled, true);
  });

  test('staffOnly rejects a pet-owner role token', () => {
    assert.equal(run(staffOnly, 'pet_owner').nextCalled, false);
  });
});

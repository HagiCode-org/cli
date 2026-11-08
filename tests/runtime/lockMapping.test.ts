import { create } from '@bufbuild/protobuf';
import { timestampFromDate } from '@bufbuild/protobuf/wkt';
import { describe, expect, it } from 'vitest';
import {
  ListLocksResponseSchema,
  LockStatusSchema,
  LockSummarySchema,
} from '../../src/generated/grpc/hagicode/coordination/v1/resource_lock_pb';
import { mapLockList, mapLockStatus } from '../../src/runtime/hagiApi';

const at = (iso: string) => timestampFromDate(new Date(iso));

describe('mapLockStatus', () => {
  it.each(['Holding', 'Queued', 'Expired', 'Requisitioned', 'None'])('maps status %s and sets myTurn only for Holding', status => {
    const view = mapLockStatus(create(LockStatusSchema, { lockId: 'eu-1/duckov', ownerId: 'sess-a', status }));

    expect(view.status).toBe(status);
    expect(view.myTurn).toBe(status === 'Holding');
  });

  it('maps a holder answer with its windows and plain numbers', () => {
    const view = mapLockStatus(
      create(LockStatusSchema, {
        lockId: 'eu-1/duckov',
        ownerId: 'sess-a',
        status: 'Holding',
        epoch: 7n,
        leaseExpiresAt: at('2026-11-07T10:10:00Z'),
        maxHoldExpiresAt: at('2026-11-08T10:00:00Z'),
        holderOwnerId: 'sess-a',
        holderLabel: 'deploy',
        queueLength: 2,
        suggestedPollIntervalMs: 5000,
        suggestedHeartbeatIntervalMs: 120000,
        serverTime: at('2026-11-07T10:00:00Z'),
        checkInEarliestAt: at('2026-11-07T10:02:00Z'),
        checkInLatestAt: at('2026-11-07T10:10:00Z'),
      }),
    );

    expect(view).toEqual({
      lockId: 'eu-1/duckov',
      ownerId: 'sess-a',
      status: 'Holding',
      myTurn: true,
      position: 0,
      epoch: 7,
      leaseExpiresAt: '2026-11-07T10:10:00.000Z',
      maxHoldExpiresAt: '2026-11-08T10:00:00.000Z',
      holder: { ownerId: 'sess-a', label: 'deploy' },
      queueLength: 2,
      suggestedPollIntervalMs: 5000,
      suggestedHeartbeatIntervalMs: 120000,
      serverTime: '2026-11-07T10:00:00.000Z',
      requisition: null,
      checkInWindow: { earliestAt: '2026-11-07T10:02:00.000Z', latestAt: '2026-11-07T10:10:00.000Z' },
      turnWindow: null,
    });
  });

  it('maps the check-in and turn windows of a queued owner', () => {
    const view = mapLockStatus(
      create(LockStatusSchema, {
        status: 'Queued',
        position: 2,
        checkInEarliestAt: at('2026-11-07T10:00:05Z'),
        checkInLatestAt: at('2026-11-07T10:01:00Z'),
        turnEarliestAt: at('2026-11-07T10:00:00Z'),
        turnLatestAt: at('2026-11-09T10:00:00Z'),
      }),
    );

    expect(view.myTurn).toBe(false);
    expect(view.position).toBe(2);
    expect(view.checkInWindow).toEqual({ earliestAt: '2026-11-07T10:00:05.000Z', latestAt: '2026-11-07T10:01:00.000Z' });
    expect(view.turnWindow).toEqual({ earliestAt: '2026-11-07T10:00:00.000Z', latestAt: '2026-11-09T10:00:00.000Z' });
  });

  it('leaves unset windows, times and the holder as null', () => {
    const view = mapLockStatus(create(LockStatusSchema, { status: 'Expired' }));

    expect(view).toMatchObject({
      leaseExpiresAt: null,
      maxHoldExpiresAt: null,
      serverTime: null,
      holder: null,
      requisition: null,
      checkInWindow: null,
      turnWindow: null,
    });
  });

  it('maps the requisition details of a displaced owner', () => {
    const view = mapLockStatus(
      create(LockStatusSchema, {
        status: 'Requisitioned',
        requisitionedByOwnerId: 'sess-d',
        requisitionReason: 'user ordered it',
        requisitionedAt: at('2026-11-07T10:05:00Z'),
      }),
    );

    expect(view.myTurn).toBe(false);
    expect(view.requisition).toEqual({ byOwnerId: 'sess-d', reason: 'user ordered it', at: '2026-11-07T10:05:00.000Z' });
  });
});

describe('mapLockList', () => {
  it('maps summaries and turns empty text into null', () => {
    const list = mapLockList(
      create(ListLocksResponseSchema, {
        locks: [
          create(LockSummarySchema, {
            lockId: 'eu-1/duckov',
            holderOwnerId: 'sess-a',
            epoch: 4n,
            leaseExpiresAt: at('2026-11-07T10:10:00Z'),
            holdStartedAt: at('2026-11-07T10:00:00Z'),
            queueLength: 1,
          }),
        ],
      }),
    );

    expect(list).toEqual([
      {
        lockId: 'eu-1/duckov',
        holderOwnerId: 'sess-a',
        holderLabel: null,
        epoch: 4,
        leaseExpiresAt: '2026-11-07T10:10:00.000Z',
        holdStartedAt: '2026-11-07T10:00:00.000Z',
        queueLength: 1,
      },
    ]);
  });
});

import { describe, expect, it } from 'vitest';

import {
  deriveParticipantTokenSecret,
  extractBearerToken,
  isValidServerToken,
} from './fl-credentials';

describe('fl-credentials', { tags: ['unit'] }, () => {
  describe('extractBearerToken', () => {
    it.each([
      ['Bearer abc.def', 'abc.def'],
      ['bearer abc', 'abc'],
      ['  Bearer abc  ', 'abc'],
    ])('reads %j', (header, token) => {
      expect(extractBearerToken(header)).toBe(token);
    });

    it.each([
      undefined,
      '',
      'Bearer',
      'Bearer ',
      'Basic abc',
      'abc',
      'Bearer a b',
      ['Bearer a', 'Bearer b'],
    ])('rejects %j', (header) => {
      expect(extractBearerToken(header)).toBeUndefined();
    });
  });

  describe('isValidServerToken', () => {
    const strong = 's'.repeat(40);

    it('matches only the exact configured token', () => {
      expect(isValidServerToken(strong, strong)).toBe(true);
      expect(isValidServerToken(`${strong}x`, strong)).toBe(false);
      expect(isValidServerToken(strong.slice(1), strong)).toBe(false);
      expect(isValidServerToken('', strong)).toBe(false);
    });

    it('never matches when the configured token is empty or weak', () => {
      expect(isValidServerToken('', '')).toBe(false);
      expect(isValidServerToken('short', 'short')).toBe(false);
    });
  });

  describe('deriveParticipantTokenSecret', () => {
    it('is deterministic, distinct from the auth secret, and key-dependent', () => {
      expect(deriveParticipantTokenSecret('a'.repeat(32))).toBe(
        deriveParticipantTokenSecret('a'.repeat(32)),
      );
      expect(deriveParticipantTokenSecret('a'.repeat(32))).not.toBe(
        'a'.repeat(32),
      );
      expect(deriveParticipantTokenSecret('a'.repeat(32))).not.toBe(
        deriveParticipantTokenSecret('b'.repeat(32)),
      );
    });

    it('refuses to derive from an empty secret', () => {
      expect(() => deriveParticipantTokenSecret('')).toThrow();
    });
  });
});

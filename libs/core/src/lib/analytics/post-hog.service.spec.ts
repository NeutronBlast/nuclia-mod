import { PostHogService } from './post-hog.service';
import { BackendConfigurationService } from '../config';
import posthog from 'posthog-js';
import { waitForAsync } from '@angular/core/testing';

jest.mock('posthog-js', () => ({
  identify: jest.fn(),
  reset: jest.fn(),
  capture: jest.fn(),
  onFeatureFlags: jest.fn((callback) => callback(['flag1', 'flag2'])),
  isFeatureEnabled: jest.fn(() => true),
  getFeatureFlag: jest.fn(() => 'flag-data'),
  people: { set: jest.fn() },
}));

describe('PostHogService', () => {
  let service: PostHogService;

  describe('init', () => {
    it('should do nothing when isBrowser is false', () => {
      service = new PostHogService({ isBrowser: false } as BackendConfigurationService);
      service.init('mail');
      expect(posthog.identify).not.toHaveBeenCalled();
    });

    it('should call posthog.identify and set people email when isBrowser is true', () => {
      service = new PostHogService({ isBrowser: true } as BackendConfigurationService);
      service.init('mail');
      expect(posthog.identify).toHaveBeenCalledWith('mail');
      expect(posthog.people.set).toHaveBeenCalledWith({ email: 'mail' });
    });
  });

  describe('reset', () => {
    it('should do nothing when isBrowser is false', () => {
      service = new PostHogService({ isBrowser: false } as BackendConfigurationService);
      service.reset();
      expect(posthog.reset).not.toHaveBeenCalled();
    });

    it('should call postHog.reset when isBrowser is true', () => {
      service = new PostHogService({ isBrowser: true } as BackendConfigurationService);
      service.reset();
      expect(posthog.reset).toHaveBeenCalledWith(true);
    });
  });

  describe('logEvent', () => {
    it('should do nothing when isBrowser is false', () => {
      service = new PostHogService({ isBrowser: false } as BackendConfigurationService);
      service.logEvent('event');
      expect(posthog.capture).not.toHaveBeenCalled();
    });

    it('should call postHog.capture when isBrowser is true', () => {
      service = new PostHogService({ isBrowser: true } as BackendConfigurationService);
      service.logEvent('event', { some: 'properties' });
      expect(posthog.capture).toHaveBeenCalledWith('event', { some: 'properties' });
    });
  });

  describe('isFeatureEnabled', () => {
    it('should return an observable calling posthog.onFeatureFlags and isFeatureEnabled', waitForAsync(() => {
      service = new PostHogService({ isBrowser: true } as BackendConfigurationService);
      service.isFeatureEnabled('feature').subscribe((isEnabled) => {
        expect(isEnabled).toBe(true);
        expect(posthog.onFeatureFlags).toHaveBeenCalled();
        expect(posthog.isFeatureEnabled).toHaveBeenCalledWith('feature', { send_event: false });
      });
    }));
  });

  describe('getFeatureFlag', () => {
    it('should return an observable calling posthog.onFeatureFlags and getFeatureFlag', waitForAsync(() => {
      service = new PostHogService({ isBrowser: true } as BackendConfigurationService);
      service.getFeatureFlag('feature').subscribe((data) => {
        expect(data).toBe('flag-data');
        expect(posthog.onFeatureFlags).toHaveBeenCalled();
        expect(posthog.getFeatureFlag).toHaveBeenCalledWith('feature', { send_event: false });
      });
    }));
  });

  describe('getEnabledFeatures', () => {
    it('should return an observable calling posthog.onFeatureFlags', waitForAsync(() => {
      service = new PostHogService({ isBrowser: true } as BackendConfigurationService);
      service.getEnabledFeatures().subscribe((data) => {
        expect(data).toEqual(['flag1', 'flag2']);
        expect(posthog.onFeatureFlags).toHaveBeenCalled();
      });
    }));
  });
});
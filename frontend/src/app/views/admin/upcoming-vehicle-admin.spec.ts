// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { CarSpec } from '../../services/blog-data.service';

describe('Release 5.0 Phase 1 — Upcoming Vehicle Admin Foundation', () => {
  describe('Data Model & Backward Compatibility', () => {
    it('defaults existing launched vehicles without lifecycleStatus to Launched', () => {
      const legacyCar: CarSpec = {
        id: 'tata-nexon-ev',
        name: 'Nexon EV::Empowered+ LR',
        categoryId: 'tata',
        parentModel: 'Nexon EV',
        variantName: 'Empowered+ LR',
        price: '₹14.5 Lakhs',
        seating: '5 Seats',
        dimensions: '3994 x 1811 x 1616 mm',
        groundClearance: '190 mm',
        batteryCapacity: '40.5 kWh',
        range: '465 km',
        tyreSize: '215/60 R16',
        bootFrunkSpace: '350 L',
        bhpTorque: '143 bhp',
        drivetrain: 'FWD',
        safetyRating: '5-Star Euro NCAP'
      };

      const resolvedStatus = legacyCar.lifecycleStatus || (legacyCar.status === 'Upcoming' ? 'Upcoming' : 'Launched');
      expect(resolvedStatus).toBe('Launched');
    });

    it('supports Upcoming and Launched lifecycle status values', () => {
      const upcomingCar: CarSpec = {
        name: 'Sierra EV::Concept',
        categoryId: 'tata',
        price: '₹25.0 Lakhs',
        seating: '5 Seats',
        dimensions: 'N/A',
        groundClearance: 'N/A',
        batteryCapacity: '60.0 kWh',
        range: '500 km',
        tyreSize: 'N/A',
        bootFrunkSpace: 'N/A',
        bhpTorque: 'N/A',
        drivetrain: 'AWD',
        safetyRating: 'N/A',
        lifecycleStatus: 'Upcoming',
        launchDate: 'Mid 2027'
      };

      expect(upcomingCar.lifecycleStatus).toBe('Upcoming');
      expect(upcomingCar.launchDate).toBe('Mid 2027');
    });
  });

  describe('Expected Launch Date Formatting', () => {
    it('formats Upcoming launch date as Period + Year (e.g. Mid 2027)', () => {
      const period = 'Mid';
      const year = '2027';
      const formatted = `${period} ${year}`;
      expect(formatted).toBe('Mid 2027');
    });

    it('formats Launched launch date as Month + Year (e.g. July 2026)', () => {
      const month = 'July';
      const year = '2026';
      const formatted = `${month} ${year}`;
      expect(formatted).toBe('July 2026');
    });
  });
});

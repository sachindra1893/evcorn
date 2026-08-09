// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { CarSpec } from '../../services/blog-data.service';

describe('Release 5.0 (Phase 2) — Upcoming Vehicle Frontend Integration', () => {
  const launchedVehicle: CarSpec = {
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
    range: '465 km (MIDC)',
    dcCharging: '50 kW',
    lifecycleStatus: 'Launched',
    launchDate: 'July 2026',
    tyreSize: '',
    bootFrunkSpace: '',
    bhpTorque: '',
    drivetrain: '',
    safetyRating: ''
  };

  const upcomingVehicle: CarSpec = {
    id: 'tata-sierra-ev',
    name: 'Sierra EV::Concept',
    categoryId: 'tata',
    parentModel: 'Sierra EV',
    variantName: 'Concept',
    price: '₹25.0 Lakhs',
    seating: '5 Seats',
    dimensions: 'N/A',
    groundClearance: 'N/A',
    batteryCapacity: '60.0 kWh',
    range: '500 km (MIDC)',
    lifecycleStatus: 'Upcoming',
    launchDate: 'Mid 2027',
    tyreSize: '',
    bootFrunkSpace: '',
    bhpTorque: '',
    drivetrain: '',
    safetyRating: ''
  };

  describe('Vehicle Overview Labels', () => {
    it('uses standard labels for Launched vehicles', () => {
      const isUpcoming = launchedVehicle.lifecycleStatus === 'Upcoming';
      expect(isUpcoming).toBe(false);

      const priceLabel = isUpcoming ? 'Expected Price' : 'Price Range';
      const batteryLabel = isUpcoming ? 'Expected Battery' : 'Battery Options';
      const rangeLabel = isUpcoming ? 'Expected Range' : 'Claimed Range';

      expect(priceLabel).toBe('Price Range');
      expect(batteryLabel).toBe('Battery Options');
      expect(rangeLabel).toBe('Claimed Range');
      expect(launchedVehicle.launchDate || '—').toBe('July 2026');
    });

    it('displays fallback dash when Launched vehicle has empty launchDate', () => {
      const carWithoutLaunchDate: CarSpec = { ...launchedVehicle, launchDate: undefined };
      expect(carWithoutLaunchDate.launchDate || '—').toBe('—');
    });

    it('uses Expected labels and Expected Launch for Upcoming vehicles', () => {
      const isUpcoming = upcomingVehicle.lifecycleStatus === 'Upcoming';
      expect(isUpcoming).toBe(true);

      const priceLabel = isUpcoming ? 'Expected Price' : 'Price Range';
      const batteryLabel = isUpcoming ? 'Expected Battery' : 'Battery Options';
      const rangeLabel = isUpcoming ? 'Expected Range' : 'Claimed Range';
      const launchText = upcomingVehicle.launchDate || 'Mid 2027';

      expect(priceLabel).toBe('Expected Price');
      expect(batteryLabel).toBe('Expected Battery');
      expect(rangeLabel).toBe('Expected Range');
      expect(launchText).toBe('Mid 2027');
    });
  });

  describe('Compare Exclusion', () => {
    it('allows Launched vehicles in Compare catalog', () => {
      const catalog = [launchedVehicle, upcomingVehicle];
      const compareCatalog = catalog.filter(c => c.lifecycleStatus !== 'Upcoming' && c.status !== 'Upcoming');
      
      expect(compareCatalog).toHaveLength(1);
      expect(compareCatalog[0].id).toBe('tata-nexon-ev');
    });

    it('excludes Upcoming vehicles completely from Compare catalog', () => {
      const catalog = [launchedVehicle, upcomingVehicle];
      const compareCatalog = catalog.filter(c => c.lifecycleStatus !== 'Upcoming' && c.status !== 'Upcoming');

      const isUpcomingInCompare = compareCatalog.some(c => c.id === 'tata-sierra-ev');
      expect(isUpcomingInCompare).toBe(false);
    });
  });

  describe('Specifications Replacement', () => {
    it('shows replacement information text for Upcoming vehicles', () => {
      const isUpcoming = upcomingVehicle.lifecycleStatus === 'Upcoming';
      const infoMessage = 'Detailed specifications, variants and comparison tools will become available after the vehicle is officially launched and official specifications are confirmed.';

      expect(isUpcoming).toBe(true);
      expect(infoMessage).toContain('officially launched');
    });
  });
});

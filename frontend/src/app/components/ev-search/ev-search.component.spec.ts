import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EvSearchComponent } from './ev-search.component';
import { BlogDataService } from '../../services/blog-data.service';
import { of } from 'rxjs';
import { Router } from '@angular/router';

describe('EvSearchComponent', () => {
  let component: EvSearchComponent;
  let fixture: ComponentFixture<EvSearchComponent>;
  let mockBlogDataService: any;
  let mockRouter: any;

  const mockCategories = [
    { id: 'tata', name: 'Tata Motors' },
    { id: 'ather', name: 'Ather' }
  ];

  const mockVehicles = [
    { id: 'v1', name: 'Nexon EV::Fearless', parentModel: 'Nexon EV', categoryId: 'tata', vehicleType: 'car' },
    { id: 'v2', name: '450X::Gen 3', parentModel: '450X', categoryId: 'ather', vehicleType: 'two-wheeler' }
  ];

  const mockArticles = [
    { id: 'a1', title: 'Top EVs in India 2026', description: 'Electric mobility overview' }
  ];

  beforeEach(async () => {
    mockBlogDataService = {
      getCategories: vi.fn().mockReturnValue(of(mockCategories)),
      getVehicles: vi.fn().mockReturnValue(of(mockVehicles)),
      getVehiclesLight: vi.fn().mockReturnValue(of(mockVehicles)),
      getArticles: vi.fn().mockReturnValue(of(mockArticles)),
      getArticlesLight: vi.fn().mockReturnValue(of(mockArticles))
    };

    mockRouter = {
      navigate: vi.fn(),
      url: '/'
    };

    await TestBed.configureTestingModule({
      imports: [EvSearchComponent],
      providers: [
        { provide: BlogDataService, useValue: mockBlogDataService },
        { provide: Router, useValue: mockRouter }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(EvSearchComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should scope search to cars only when scope="car"', () => {
    component.scope = 'car';
    component.searchQuery = '450X';
    component.onSearchInput();

    // Ather 450X is a two-wheeler, should NOT match in car scope
    const matchingVehicles = component.results.filter(r => r.type === 'vehicle');
    expect(matchingVehicles.length).toBe(0);

    component.searchQuery = 'Nexon';
    component.onSearchInput();
    const carMatches = component.results.filter(r => r.type === 'vehicle');
    expect(carMatches.length).toBe(1);
    expect(carMatches[0].name).toBe('Nexon EV');
  });

  it('should scope search to two-wheelers only when scope="two-wheeler"', () => {
    component.scope = 'two-wheeler';
    component.searchQuery = 'Nexon';
    component.onSearchInput();

    // Nexon EV is a car, should NOT match in two-wheeler scope
    const matchingVehicles = component.results.filter(r => r.type === 'vehicle');
    expect(matchingVehicles.length).toBe(0);

    component.searchQuery = '450X';
    component.onSearchInput();
    const bikeMatches = component.results.filter(r => r.type === 'vehicle');
    expect(bikeMatches.length).toBe(1);
    expect(bikeMatches[0].name).toBe('450X');
  });

  it('should include both cars and two-wheelers when scope="all"', () => {
    component.scope = 'all';
    component.searchQuery = 'EV';
    component.onSearchInput();

    expect(component.results.length).toBeGreaterThan(0);
  });
});

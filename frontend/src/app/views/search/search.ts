import { Component, OnInit } from '@angular/core';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { SeoService } from '../../services/seo.service';
import { SchemaService } from '../../services/schema.service';
import { BlogDataService } from '../../services/blog-data.service';

interface SearchItem {
  type: 'article' | 'company';
  title: string;
  description: string;
  id: string;
  logo?: string;
  active?: boolean;
  createdAt?: string;
}

@Component({
  selector: 'app-search',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="search-page">
      <h1>Search EVCorn</h1>
      
      <div class="search-controls">
        <div class="input-wrapper">
          <input 
            type="text" 
            placeholder="Search articles, battery types, EV brands..." 
            (input)="onSearchInput($event)"
            [value]="searchQuery"
          >
          <span class="search-icon">🔍</span>
        </div>

        <div class="filter-tabs">
          <button 
            [class.active]="activeFilter === 'all'" 
            (click)="setFilter('all')"
          >All</button>
          <button 
            [class.active]="activeFilter === 'article'" 
            (click)="setFilter('article')"
          >Articles</button>
          <button 
            [class.active]="activeFilter === 'company'" 
            (click)="setFilter('company')"
          >Companies</button>
        </div>
      </div>

      <div class="results-container">
        @if (filteredItems.length > 0) {
          <div class="results-grid">
            @for (item of filteredItems; track item.id) {
              @if (item.type === 'article') {
                @if (item.active) {
                  <a [routerLink]="['/articles', item.id]" class="result-card article-item">
                    <div class="type-tag">Article</div>
                    <h2>{{ item.title }}</h2>
                    <p>{{ item.description }}</p>
                  </a>
                } @else {
                  <div class="result-card article-item coming-soon" (click)="showComingSoon(item.title)">
                    <div class="type-tag">Article (Coming Soon)</div>
                    <h2>{{ item.title }}</h2>
                    <p>{{ item.description }}</p>
                  </div>
                }
              } @else {
                <div class="result-card company-item" (click)="showCompanyDetail(item)">
                  <div class="type-tag company-tag">Company</div>
                  @if (item.logo) {
                    <img [src]="item.logo" [alt]="item.title" loading="lazy" width="80" height="40">
                  }
                  <h2>{{ item.title }}</h2>
                  <p>{{ item.description }}</p>
                </div>
              }
            }
          </div>
        } @else {
          <div class="no-results">
            <p>No results found for "{{ searchQuery }}". Try searching for 'battery', 'range', 'Tesla' or 'emissions'.</p>
          </div>
        }
      </div>

      @if (selectedCompany) {
        <div class="modal-backdrop" (click)="closeCompanyDetail()">
          <div class="modal-content" (click)="$event.stopPropagation()">
            <button class="close-btn" (click)="closeCompanyDetail()">×</button>
            <img [src]="selectedCompany.logo" [alt]="selectedCompany.title" loading="lazy" width="120" height="60">
            <h2>{{ selectedCompany.title }}</h2>
            <p class="company-desc">{{ selectedCompany.description }}</p>
            <div class="additional-info">
              <p><strong>Focus Area:</strong> Carbon-neutral transportation, high-efficiency drivetrains.</p>
              <p><strong>Compare Availability:</strong> Available in the <a routerLink="/compare" (click)="closeCompanyDetail()">Compare</a> tool.</p>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .search-page {
      min-height: 90vh;
      background: #0D1418;
      color: #E6ECEC;
      padding: 120px 20px 60px 20px;
    }
    h1 {
      text-align: center;
      margin-bottom: 30px;
      font-size: 2.8rem;
      color: #00D4FF;
    }
    .search-controls {
      max-width: 800px;
      margin: 0 auto 40px auto;
      display: flex;
      flex-direction: column;
      gap: 20px;
    }
    .input-wrapper {
      position: relative;
      width: 100%;
    }
    input {
      width: 100%;
      padding: 16px 20px 16px 50px;
      background: #1A252A;
      color: white;
      border: 1px solid rgba(0, 212, 255, 0.2);
      border-radius: 30px;
      font-size: 1.1rem;
      outline: none;
      transition: all 0.3s ease;
    }
    input:focus {
      border-color: #00D4FF;
      box-shadow: 0 0 15px rgba(0, 212, 255, 0.25);
    }
    .search-icon {
      position: absolute;
      left: 20px;
      top: 50%;
      transform: translateY(-50%);
      font-size: 1.3rem;
      pointer-events: none;
    }
    .filter-tabs {
      display: flex;
      gap: 10px;
      justify-content: center;
    }
    .filter-tabs button {
      padding: 8px 20px;
      border-radius: 20px;
      background: transparent;
      color: #A8B2B2;
      border: 1px solid rgba(255, 255, 255, 0.1);
      font-size: 0.95rem;
      cursor: pointer;
      transition: all 0.2s ease;
    }
    .filter-tabs button:hover, .filter-tabs button.active {
      color: #00D4FF;
      border-color: #00D4FF;
      background: rgba(0, 212, 255, 0.05);
    }
    .results-container {
      max-width: 1100px;
      margin: 0 auto;
    }
    .results-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 25px;
    }
    .result-card {
      background: #1A252A;
      border-radius: 12px;
      padding: 24px;
      border: 1px solid rgba(0, 212, 255, 0.05);
      transition: all 0.3s ease;
      display: flex;
      flex-direction: column;
      cursor: pointer;
      text-decoration: none;
      color: inherit;
    }
    .result-card:hover {
      transform: translateY(-5px);
      border-color: #00D4FF;
      box-shadow: 0 10px 20px rgba(0, 212, 255, 0.1);
    }
    .type-tag {
      align-self: flex-start;
      padding: 3px 8px;
      border-radius: 4px;
      font-size: 0.75rem;
      font-weight: 600;
      background: rgba(245, 210, 142, 0.15);
      color: #f5d28e;
      margin-bottom: 15px;
      text-transform: uppercase;
    }
    .company-tag {
      background: rgba(0, 212, 255, 0.15);
      color: #00D4FF;
    }
    .result-card img {
      max-width: 80px;
      max-height: 40px;
      object-fit: contain;
      margin-bottom: 15px;
    }
    .result-card h2 {
      font-size: 1.3rem;
      margin-bottom: 10px;
      color: #E6ECEC;
      text-align: left;
    }
    .result-card p {
      font-size: 0.95rem;
      color: #A8B2B2;
      line-height: 1.6;
    }
    .coming-soon {
      opacity: 0.7;
    }
    .no-results {
      text-align: center;
      padding: 50px 20px;
      color: #A8B2B2;
      font-size: 1.1rem;
    }
    .modal-backdrop {
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: rgba(0, 0, 0, 0.8);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 2000;
      backdrop-filter: blur(5px);
    }
    .modal-content {
      background: #1A252A;
      border-radius: 12px;
      border: 1px solid #00D4FF;
      width: 90%;
      max-width: 500px;
      padding: 40px 30px;
      text-align: center;
      position: relative;
      box-shadow: 0 10px 40px rgba(0, 212, 255, 0.2);
    }
    .modal-content img {
      max-width: 120px;
      margin-bottom: 20px;
    }
    .modal-content h2 {
      font-size: 1.8rem;
      color: #00D4FF;
      margin-bottom: 15px;
    }
    .company-desc {
      font-size: 1.1rem;
      color: #E6ECEC;
      line-height: 1.7;
      margin-bottom: 25px;
    }
    .additional-info {
      text-align: left;
      border-top: 1px solid rgba(255, 255, 255, 0.08);
      padding-top: 20px;
      font-size: 0.95rem;
      color: #A8B2B2;
    }
    .additional-info a {
      color: #00D4FF;
      text-decoration: none;
    }
    .close-btn {
      position: absolute;
      right: 20px;
      top: 15px;
      font-size: 2rem;
      background: transparent;
      border: none;
      color: #A8B2B2;
      cursor: pointer;
    }
    .close-btn:hover {
      color: #00D4FF;
    }
    @media (max-width: 768px) {
      h1 {
        font-size: 2.2rem;
      }
      input {
        font-size: 1rem;
      }
      .filter-tabs {
        flex-wrap: wrap;
      }
    }
  `]
})
export class SearchComponent implements OnInit {
  searchQuery = '';
  activeFilter: 'all' | 'article' | 'company' = 'all';
  selectedCompany: SearchItem | null = null;

  searchItems: SearchItem[] = [
    {
      type: 'company',
      id: 'rivian',
      title: 'Rivian',
      description: 'American EV automaker specializing in electric adventure vehicles like the R1T truck and R1S SUV.',
      logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e4/Rivian_Logo.svg/200px-Rivian_Logo.svg.png'
    },
    {
      type: 'company',
      id: 'tesla',
      title: 'Tesla',
      description: 'Global leader in EV production, battery storage systems, and solar panels. Known for Model S, 3, X, Y.',
      logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/46/Tesla_Logo.svg/200px-Tesla_Logo.svg.png'
    },
    {
      type: 'company',
      id: 'rimac',
      title: 'Rimac',
      description: 'Croatian hypercar manufacturer known for pushing boundaries in electric performance with the Rimac Nevera.',
      logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9e/Rimac_Automobili_Logo.svg/200px-Rimac_Automobili_Logo.svg.png'
    },
    {
      type: 'company',
      id: 'lucid',
      title: 'Lucid',
      description: 'Luxury EV manufacturer focusing on efficiency, battery performance, and interior space. Known for Lucid Air.',
      logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/64/Lucid_Motors_logo.svg/200px-Lucid_Motors_logo.svg.png'
    },
    {
      type: 'company',
      id: 'byd',
      title: 'BYD',
      description: 'Chinese multi-national company leading in EV passenger vehicles, buses, and Blade Battery technology.',
      logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/05/BYD_Company_Logo.svg/200px-BYD_Company_Logo.svg.png'
    }
  ];

  constructor(
    private dataService: BlogDataService,
    private seoService: SeoService,
    private schemaService: SchemaService,
    private route: ActivatedRoute
  ) {}

  ngOnInit() {
    this.seoService.updateSeo({
      title: 'Search Electric Vehicles & EV News',
      description: 'Search for electric cars, two-wheelers, EV brands, and the latest news articles on EVCorn.'
    });

    this.schemaService.setSchema([
      this.schemaService.buildBreadcrumbs([
        { name: 'Home', url: '' },
        { name: 'Search', url: '/search' }
      ]),
      this.schemaService.buildWebPage(
        'Search EVCorn',
        'Search for electric cars, two-wheelers, EV brands, and the latest news articles on EVCorn.'
      )
    ]);

    this.route.queryParams.subscribe(params => {
      const q = params['q'];
      if (q) {
        this.searchQuery = q;
      }
      this.loadSearchArticles();
    });
  }

  loadSearchArticles() {
    this.dataService.getArticlesLight().subscribe({
      next: (articles) => {
        const articleSearchItems: SearchItem[] = articles.map(art => ({
          type: 'article' as const,
          id: art.id || '',
          title: art.title || '',
          description: art.description || '',
          active: art.active,
          createdAt: art.createdAt
        }));
        
        // Remove any old article search items and merge fresh ones
        const companies = this.searchItems.filter(item => item.type === 'company');
        this.searchItems = [...companies, ...articleSearchItems];
      },
      error: (err) => console.error('Error fetching search articles:', err)
    });
  }

  onSearchInput(event: Event) {
    const input = event.target as HTMLInputElement;
    this.searchQuery = input.value;
    this.updateSearchSchema();
  }

  setFilter(filter: 'all' | 'article' | 'company') {
    this.activeFilter = filter;
    this.updateSearchSchema();
  }

  updateSearchSchema() {
    if (this.searchQuery.trim().length > 0) {
      this.schemaService.setSchema([
        this.schemaService.buildBreadcrumbs([
          { name: 'Home', url: '' },
          { name: 'Search', url: '/search' }
        ]),
        this.schemaService.buildSearchResultsPage(this.searchQuery)
      ]);
    }
  }

  get filteredItems(): SearchItem[] {
    const query = this.searchQuery.toLowerCase().trim();
    let results = [...this.searchItems];

    if (this.activeFilter !== 'all') {
      results = results.filter(item => item.type === this.activeFilter);
    }

    if (query) {
      const queryTokens = query.split(/\s+/).filter(Boolean);
      results = results.filter(item => {
        const title = item.title.toLowerCase();
        const desc = item.description.toLowerCase();
        
        // Match specific sub-searches (all tokens must match title or description)
        return queryTokens.every(token => title.includes(token) || desc.includes(token));
      });
    }

    // Sort: Articles by date (latest first), then companies
    return results.sort((a, b) => {
      if (a.type === 'article' && b.type === 'article') {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA; // Newest first
      }
      // Put companies at the end of combined search lists
      if (a.type === 'article' && b.type === 'company') return -1;
      if (a.type === 'company' && b.type === 'article') return 1;
      return 0;
    });
  }

  showComingSoon(title: string) {
    alert(`"${title}" is currently under preparation and will be published soon!`);
  }

  showCompanyDetail(company: SearchItem) {
    this.selectedCompany = company;
  }

  closeCompanyDetail() {
    this.selectedCompany = null;
  }
}

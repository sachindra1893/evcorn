import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class EVDecisionService {
  private readonly baseUrl = '/api/domain';

  constructor(private http: HttpClient) {}

  getEVScore(vehicleSpec: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/score`, vehicleSpec);
  }

  calculateTCO(params: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/tco`, params);
  }

  calculateChargingCost(params: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/charging-cost`, params);
  }

  estimateRealWorldRange(params: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/real-range`, params);
  }

  checkCompatibility(params: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/compatibility`, params);
  }

  getSmartRecommendations(preferences: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/smart-recommendations`, preferences);
  }
}

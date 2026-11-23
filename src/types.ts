export type RiskLevel = 'Low' | 'Moderate' | 'High' | 'Critical';

export interface GlacialLake {
  id: string;
  name: string;
  region: string;
  location_lat: number;
  location_lng: number;
  elevation: number;
  area_km2: number;
  area_10y_ago_km2: number;
  volume_million_m3: number;
  dam_type: 'Moraine' | 'Ice' | 'Bedrock' | 'Mixed';
  dam_stability_index: number;
  slope_index: number;
  temperature_index: number;
  distance_to_glacier_km: number;
  population_at_risk: number;
  infrastructure_at_risk: string;
  current_risk_level: RiskLevel;
  risk_score: number;
  lstm_probability: number;
  lstm_predicted_class: 'Normal' | 'Watch' | 'Warning' | 'Critical';
  change_rate: number;
  ndwi_mean: number;
  ndsi_mean: number;
  ndvi_mean: number;
  last_updated: string;
}

export interface LakeMetric {
  id: number;
  lake_id: string;
  timestamp: string;
  water_level: number;
  surface_area: number;
  temperature: number;
  precipitation: number;
  ice_thickness: number;
  temperature_index: number;
  lstm_risk_prob: number;
  predicted_signal: 'Normal' | 'Watch' | 'Warning' | 'Critical';
}

export interface Alert {
  name: string;
  region: string;
  lake_id: string;
  timestamp: string;
  water_level: number;
  temperature: number;
  lstm_risk_prob: number;
  message: string;
  level: 'Critical' | 'High' | 'Medium' | 'Low';
}

export interface LstmModelSummary {
  modelName: string;
  architecture: string;
  classificationAccuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
  rocAuc: number;
  lakesCovered: number;
  historicalYears: number;
  totalSequences: number;
  sequenceWindowMonths: number;
  classes: string[];
  confusionMatrix: number[][];
  trainingHistory: {
    epoch: number;
    trainAccuracy: number;
    valAccuracy: number;
    trainLoss: number;
    valLoss: number;
  }[];
  featureImportance: {
    feature: string;
    weight: number;
    source: string;
  }[];
}

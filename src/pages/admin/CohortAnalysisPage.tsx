/**
 * Admin Cohort Analysis Page
 * Full-featured cohort analysis dashboard
 */

import { Layout } from '@/components/layout/Layout';
import { CohortAnalysis } from '@/components/analytics/CohortAnalysis';

export default function CohortAnalysisPage() {
  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Cohort Analysis</h1>
          <p className="text-muted-foreground">
            Analyze user retention and behavior by cohorts
          </p>
        </div>
        <CohortAnalysis />
      </div>
    </Layout>
  );
}



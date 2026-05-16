import { NextResponse } from "next/server";
import { getDemoActivities, getDemoAssociations, getDemoStravaCompagnons, getDemoStats, DEMO_ATHLETE, DEMO_PARCOURS, DEMO_COMPAGNONS, DEMO_OBJECTIFS } from "@/lib/demo-data";

export async function GET() {
  return NextResponse.json({
    activities: getDemoActivities(),
    athlete: DEMO_ATHLETE,
    stats: getDemoStats(),
    lastSync: new Date().toISOString(),
    associations: getDemoAssociations(),
    stravaCompagnons: getDemoStravaCompagnons(),
    parcours: DEMO_PARCOURS,
    compagnons: DEMO_COMPAGNONS,
    objectifs: DEMO_OBJECTIFS,
    isDemo: true,
  });
}
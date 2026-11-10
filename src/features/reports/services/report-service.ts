/**
 * Community Safety Report Service.
 * Allows users to report unlit stretches, harassment, non-functional streetlights,
 * and safety concerns directly to Supabase PostGIS database.
 */

import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import type { CommunityReport } from '@/types/geo';

export async function submitSafetyReport(
  report: Omit<CommunityReport, 'id' | 'createdAt'>,
): Promise<{ success: boolean; error?: string }> {
  if (!isSupabaseConfigured) {
    return { success: true }; // offline mock success
  }

  try {
    const { error } = await supabase.from('community_reports').insert({
      report_type: report.reportType,
      description: report.description,
      latitude: report.latitude,
      longitude: report.longitude,
      severity: report.severity,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message ?? 'Network error' };
  }
}

export async function getRecentReports(): Promise<CommunityReport[]> {
  if (!isSupabaseConfigured) return [];

  try {
    const { data, error } = await supabase
      .from('community_reports')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(30);

    if (error || !Array.isArray(data)) return [];

    return data.map((r: any) => ({
      id: r.id,
      reportType: r.report_type,
      description: r.description,
      latitude: r.latitude,
      longitude: r.longitude,
      severity: r.severity,
      createdAt: r.created_at,
    }));
  } catch {
    return [];
  }
}


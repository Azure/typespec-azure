import type { CoverageSummary } from "@typespec/spec-dashboard";
import { Dashboard } from "@typespec/spec-dashboard";
import type { ScenarioData } from "@typespec/spec-coverage-sdk";
import { FunctionComponent, useEffect } from "react";

export interface AzureDashboardProps {
  coverageSummaries: CoverageSummary[];
}

export const AzureDashboard: FunctionComponent<AzureDashboardProps> = ({ coverageSummaries }) => {
  // Split Azure coverage summaries into data plane and management plane
  const processedSummaries = coverageSummaries.flatMap((coverageSummary) => {
    if (coverageSummary.manifest.setName === "@azure-tools/azure-http-specs") {
      return splitAzureCoverageSummary(coverageSummary);
    }
    return [coverageSummary];
  });

  // Use DOM manipulation to update table headers after render
  useEffect(() => {
    const updateTableHeaders = () => {
      // Find all table headers with "Azure" text and update based on context
      const tables = document.querySelectorAll('table');
      tables.forEach((table) => {
        const headerCell = table.querySelector('th');
        if (headerCell && headerCell.textContent?.includes('Azure')) {
          // Look for ResourceManager scenarios in the table to determine type
          const hasResourceManager = Array.from(table.querySelectorAll('tr')).some(row => 
            row.textContent?.includes('Azure_ResourceManager_')
          );
          
          const hasNonResourceManager = Array.from(table.querySelectorAll('tr')).some(row => 
            row.textContent?.includes('Azure_') && !row.textContent?.includes('Azure_ResourceManager_')
          );

          if (hasResourceManager && !hasNonResourceManager) {
            headerCell.textContent = headerCell.textContent.replace('Azure', 'Azure Management Plane');
          } else if (hasNonResourceManager && !hasResourceManager) {
            headerCell.textContent = headerCell.textContent.replace('Azure', 'Azure Data Plane');
          }
        }
      });
    };

    // Update headers after a short delay to ensure DOM is rendered
    const timer = setTimeout(updateTableHeaders, 100);
    
    // Also update on any DOM changes
    const observer = new MutationObserver(updateTableHeaders);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      clearTimeout(timer);
      observer.disconnect();
    };
  }, [processedSummaries]);

  return <Dashboard coverageSummaries={processedSummaries} />;
};

function splitAzureCoverageSummary(coverageSummary: CoverageSummary): CoverageSummary[] {
  const dataPlaneScenarios: ScenarioData[] = [];
  const mgmtPlaneScenarios: ScenarioData[] = [];

  // Split scenarios based on whether they are resource manager scenarios
  coverageSummary.manifest.scenarios.forEach((scenario) => {
    if (scenario.name.startsWith("Azure_ResourceManager_")) {
      mgmtPlaneScenarios.push(scenario);
    } else {
      dataPlaneScenarios.push(scenario);
    }
  });

  const result: CoverageSummary[] = [];

  // Create data plane summary if it has scenarios
  if (dataPlaneScenarios.length > 0) {
    result.push({
      manifest: {
        ...coverageSummary.manifest,
        scenarios: dataPlaneScenarios,
      },
      generatorReports: createFilteredGeneratorReports(coverageSummary, dataPlaneScenarios),
    });
  }

  // Create management plane summary if it has scenarios
  if (mgmtPlaneScenarios.length > 0) {
    result.push({
      manifest: {
        ...coverageSummary.manifest,
        scenarios: mgmtPlaneScenarios,
      },
      generatorReports: createFilteredGeneratorReports(coverageSummary, mgmtPlaneScenarios),
    });
  }

  return result;
}

function createFilteredGeneratorReports(
  coverageSummary: CoverageSummary, 
  scenarios: ScenarioData[]
) {
  const filteredReports: Record<string, any> = {};
  
  Object.entries(coverageSummary.generatorReports).forEach(([lang, report]) => {
    if (!report) {
      filteredReports[lang] = undefined;
      return;
    }

    // Filter results to only include scenarios for this plane
    const filteredResults: Record<string, any> = {};
    scenarios.forEach((scenario) => {
      if (report.results[scenario.name] !== undefined) {
        filteredResults[scenario.name] = report.results[scenario.name];
      }
    });

    filteredReports[lang] = {
      ...report,
      results: filteredResults,
    };
  });

  return filteredReports;
}
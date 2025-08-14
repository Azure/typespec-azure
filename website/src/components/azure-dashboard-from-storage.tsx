import { useState } from "react";
import { 
  type CoverageFromAzureStorageOptions, 
  type CoverageSummary, 
  getCoverageSummaries 
} from "@typespec/spec-dashboard";
import { useEffectAsync } from "../utils/use-effect-async";
import { AzureDashboard } from "./azure-dashboard";

export interface AzureDashboardFromStorageProps {
  options: CoverageFromAzureStorageOptions;
}

export const AzureDashboardFromStorage = (props: AzureDashboardFromStorageProps) => {
  const [coverageSummaries, setCoverageSummaries] = useState<CoverageSummary[] | undefined>(
    undefined,
  );

  useEffectAsync(async () => {
    const coverageSummaries = await getCoverageSummaries(props.options);

    if (coverageSummaries) {
      setCoverageSummaries(() => coverageSummaries);
    }
  }, []);
  
  return (
    <div>
      {coverageSummaries ? (
        <AzureDashboard coverageSummaries={coverageSummaries}></AzureDashboard>
      ) : (
        "Loading"
      )}
    </div>
  );
};
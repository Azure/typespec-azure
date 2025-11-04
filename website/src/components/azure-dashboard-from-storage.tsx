import { useEffect, useState } from "react";
import { 
  type CoverageFromAzureStorageOptions, 
  type CoverageSummary, 
  getCoverageSummaries 
} from "@typespec/spec-dashboard";
import { AzureDashboard } from "./azure-dashboard";

export const AzureDashboardFromStorage = (props: { options: CoverageFromAzureStorageOptions }) => {
  const [coverageSummaries, setCoverageSummaries] = useState<CoverageSummary[] | undefined>(
    undefined,
  );

  useEffect(() => {
    getCoverageSummaries(props.options).then((coverageSummaries) => {
      if (coverageSummaries) {
        setCoverageSummaries(coverageSummaries);
      }
    }).catch(console.error);
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
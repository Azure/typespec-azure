import { BreezeChannelIdentifier } from "@microsoft/applicationinsights-common";
import { ApplicationInsights } from "@microsoft/applicationinsights-web-basic";
import { ExtensionConfig } from "../reporters/types.js";

export interface GetAppInsightsClientProps {
  endpointUrl?: string;
  httpXHROverride: ExtensionConfig["httpXHROverride"];
  instrumentationKey: string;
}

export function getAppInsightsClient(props: GetAppInsightsClientProps): ApplicationInsights {
  const appInsightsClient = new ApplicationInsights({
    instrumentationKey: props.instrumentationKey,
    endpointUrl: props.endpointUrl,
    autoTrackPageVisitTime: false,
    disableAjaxTracking: true,
    disableExceptionTracking: true,
    disableFetchTracking: true,
    disableCorrelationHeaders: true,
    disableCookiesUsage: true,
    disableFlushOnBeforeUnload: true,
    disableFlushOnUnload: true,
    emitLineDelimitedJson: true,
    maxBatchInterval: 100, // 100 ms
    extensionConfig: {
      [BreezeChannelIdentifier]: {
        alwaysUseXhrOverride: true,
        httpXHROverride: props.httpXHROverride,
      },
    },
  });

  return appInsightsClient;
}

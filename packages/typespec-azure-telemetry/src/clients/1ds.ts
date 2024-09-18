import { AppInsightsCore } from "@microsoft/1ds-core-js";
import { IChannelConfiguration, PostChannel } from "@microsoft/1ds-post-js";
import { ExtensionConfig } from "../reporters/types.js";

export interface Get1DSClientProps {
  endpointUrl?: string;
  httpXHROverride: ExtensionConfig["httpXHROverride"];
  instrumentationKey: string;
}

export function get1DSClient(props: Get1DSClientProps): AppInsightsCore {
  const appInsightsCore = new AppInsightsCore();
  const postChannel = new PostChannel();

  const postChannelConfig: IChannelConfiguration = {
    alwaysUseXhrOverride: true,
    httpXHROverride: props.httpXHROverride,
  };

  appInsightsCore.initialize(
    {
      instrumentationKey: props.instrumentationKey,
      endpointUrl: props.endpointUrl ?? "https://mobile.events.data.microsoft.com/OneCollector/1.0",
      loggingLevelConsole: 0,
      loggingLevelTelemetry: 0,
      disableCookiesUsage: true,
      disableDbgExt: true,
      channels: [[postChannel]],
      extensionConfig: {
        [postChannel.identifier]: postChannelConfig,
      },
    },
    []
  );
  return appInsightsCore;
}

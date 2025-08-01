export interface IntegrationTestsConfig {
  suites: Record<string, IntegrationTestSuite>;
}

export interface IntegrationTestSuite {
  repo: string;
  branch: string;
}

import Link from "@docusaurus/Link";
import useDocusaurusContext from "@docusaurus/useDocusaurusContext";
import HomepageFeatures from "@site/src/components/HomepageFeatures";
import Layout from "@theme/Layout";
import clsx from "clsx";

import styles from "./index.module.css";

function HomepageHeader() {
  const { siteConfig } = useDocusaurusContext();
  return (
    <header className={clsx("hero hero--primary", styles.heroBanner)}>
      <div className="container">
        <h1 className="hero__title">{siteConfig.title}</h1>
        <p className="hero__subtitle">{siteConfig.tagline}</p>
        <div className={styles.buttons}>
          <Link className="button button--secondary button--lg" to="docs/getstarted/installation">
            Azure Data-plane TypeSpec Tutorial
          </Link>
        </div>
        <p />
        <div className={styles.buttons}>
          <Link className="button button--secondary button--lg" to="docs/getstarted/installation">
            Azure ARM TypeSpec Tutorial
          </Link>
        </div>
        <p />
        <div className={styles.buttons}>
          <Link className="button button--secondary button--lg" to="docs/getstarted/installation">
            Azure ARM ProviderHub Tutorial
          </Link>
        </div>
      </div>
    </header>
  );
}

export default function Home() {
  const { siteConfig } = useDocusaurusContext();
  return (
    <Layout title={`${siteConfig.title}`} description="TypeSpec Azure Website">
      <HomepageHeader />
      <main>
        <HomepageFeatures />
      </main>
    </Layout>
  );
}

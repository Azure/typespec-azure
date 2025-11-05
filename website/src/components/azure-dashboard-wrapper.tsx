import { DashboardFromAzureStorage, type CoverageFromAzureStorageOptions } from "@typespec/spec-dashboard";
import { useEffect, useRef } from "react";

export const AzureDashboardWrapper = (props: { options: CoverageFromAzureStorageOptions }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const processedRef = useRef(false);

  useEffect(() => {
    const splitTables = () => {
      console.log('[AzureDashboardWrapper] splitTables called');
      if (!containerRef.current) {
        console.log('[AzureDashboardWrapper] No containerRef');
        return;
      }
      if (processedRef.current) {
        console.log('[AzureDashboardWrapper] Already processed');
        return;
      }

      const tables = containerRef.current.querySelectorAll('table');
      console.log(`[AzureDashboardWrapper] Found ${tables.length} tables`);
      
      tables.forEach((table, index) => {
        // Skip if already processed
        if (table.hasAttribute('data-azure-split')) {
          console.log(`[AzureDashboardWrapper] Table ${index} already has split attribute`);
          return;
        }
        
        const headerCell = table.querySelector('th');
        console.log(`[AzureDashboardWrapper] Table ${index} header:`, headerCell?.textContent);
        if (!headerCell?.textContent?.includes('Azure')) return;

        // Find all rows in the table body
        const tbody = table.querySelector('tbody');
        if (!tbody) return;

        const allRows = Array.from(tbody.querySelectorAll('tr'));
        
        // Separate rows by type
        const dataPlaneRows: Element[] = [];
        const mgmtPlaneRows: Element[] = [];
        
        allRows.forEach(row => {
          const text = row.textContent || '';
          if (text.includes('Azure_ResourceManager_')) {
            mgmtPlaneRows.push(row);
          } else if (text.includes('Azure_')) {
            dataPlaneRows.push(row);
          }
        });

        console.log(`[AzureDashboardWrapper] Data plane: ${dataPlaneRows.length}, Mgmt plane: ${mgmtPlaneRows.length}`);
        
        // Only split if we have both types
        if (dataPlaneRows.length > 0 && mgmtPlaneRows.length > 0) {
          console.log('[AzureDashboardWrapper] Splitting table!');
          // Mark table as processed
          table.setAttribute('data-azure-split', 'true');
          
          // Clone the entire table for management plane
          const mgmtTable = table.cloneNode(true) as HTMLElement;
          mgmtTable.setAttribute('data-azure-split', 'true');
          
          // Update the headers
          const dataHeader = table.querySelector('th');
          const mgmtHeader = mgmtTable.querySelector('th');
          
          if (dataHeader && dataHeader.textContent) {
            dataHeader.textContent = dataHeader.textContent.replace('Azure', 'Azure Data Plane');
          }
          if (mgmtHeader && mgmtHeader.textContent) {
            mgmtHeader.textContent = mgmtHeader.textContent.replace('Azure', 'Azure Management Plane');
          }
          
          // Clear and repopulate the table bodies
          const dataTbody = table.querySelector('tbody');
          const mgmtTbody = mgmtTable.querySelector('tbody');
          
          if (dataTbody && mgmtTbody) {
            dataTbody.innerHTML = '';
            mgmtTbody.innerHTML = '';
            
            dataPlaneRows.forEach(row => {
              dataTbody.appendChild(row.cloneNode(true));
            });
            
            mgmtPlaneRows.forEach(row => {
              mgmtTbody.appendChild(row.cloneNode(true));
            });
            
            // Insert the management plane table after the data plane table's container
            const tableContainer = table.closest('div');
            if (tableContainer?.parentElement) {
              const mgmtContainer = document.createElement('div');
              mgmtContainer.style.margin = '5px';
              mgmtContainer.appendChild(mgmtTable);
              
              const nextSibling = tableContainer.nextSibling;
              if (nextSibling) {
                tableContainer.parentElement.insertBefore(mgmtContainer, nextSibling);
              } else {
                tableContainer.parentElement.appendChild(mgmtContainer);
              }
              
              processedRef.current = true;
              console.log('[AzureDashboardWrapper] Table split complete!');
            } else {
              console.log('[AzureDashboardWrapper] No table container parent found');
            }
          } else {
            console.log('[AzureDashboardWrapper] No tbody found');
          }
        } else {
          console.log('[AzureDashboardWrapper] Not enough rows to split - need both data plane and mgmt plane rows');
        }
      });
    };

    // Try splitting multiple times as React renders asynchronously
    const timers: NodeJS.Timeout[] = [];
    [500, 1000, 1500, 2000, 3000].forEach(delay => {
      timers.push(setTimeout(splitTables, delay));
    });

    // Also use MutationObserver to catch when tables are added
    const observer = new MutationObserver(() => {
      if (!processedRef.current) {
        splitTables();
      }
    });

    if (containerRef.current) {
      observer.observe(containerRef.current, {
        childList: true,
        subtree: true,
      });
    }

    return () => {
      timers.forEach(timer => clearTimeout(timer));
      observer.disconnect();
    };
  }, []);

  return (
    <div ref={containerRef}>
      <DashboardFromAzureStorage options={props.options} />
    </div>
  );
};

import { useState, useMemo } from "react";
import { ActionPanel, Action, Icon, List, Toast, showToast } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { PackageDetail } from "./PackageDetail";
import { Package } from "./types";

type PackageSections = {
  [key: string]: Package[];
};

export default function Command() {
  const [inputValue, setInputValue] = useState<string>("");
  const [selectedRepo, setSelectedRepo] = useState<string>("");

  const { data, isLoading, error } = useFetch<{ [key: string]: Package[] }>(
    `https://repology.org/api/v1/project/${inputValue}`,
    {
      keepPreviousData: true,
      execute: inputValue.length >= 2,
    },
  );

  if (error) {
    showToast(Toast.Style.Failure, "Failed to fetch data", error.message);
  }

  const packages = data ? Object.values(data).flat() : [];

  // Extract unique repositories for the dropdown
  const repos = useMemo(() => {
    const allRepos = packages.map((pkg) => pkg.repo);
    return Array.from(new Set(allRepos));
  }, [packages]);

  // Sort repositories alphabetically
  repos.sort((a, b) => a.localeCompare(b));

  // Filter packages based on the selected repository
  const filteredPackages = useMemo(() => {
    return packages.filter((pkg) => selectedRepo === "" || pkg.repo === selectedRepo);
  }, [packages, selectedRepo]);

  // Group packages by repository
  const packageSections = useMemo(() => {
    return filteredPackages.reduce<PackageSections>((sections, pkg) => {
      const sectionKey = pkg.repo;
      if (!sections[sectionKey]) {
        sections[sectionKey] = [];
      }
      sections[sectionKey].push(pkg);
      return sections;
    }, {});
  }, [filteredPackages]);

  // Sort each section's packages by visiblename or srcname
  for (const section in packageSections) {
    packageSections[section].sort((a, b) => {
      const aName = a.visiblename || a.srcname;
      const bName = b.visiblename || b.srcname;
      return aName.localeCompare(bName);
    });
  }

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={setInputValue}
      searchBarPlaceholder="Search for packages"
      throttle={true}
      searchBarAccessory={
        <List.Dropdown tooltip="Select Repository" storeValue={true} onChange={setSelectedRepo}>
          <List.Dropdown.Item title="All Repositories" value="" />
          {repos.map((repo) => (
            <List.Dropdown.Item key={repo} title={repo} value={repo} />
          ))}
        </List.Dropdown>
      }
    >
      {inputValue.length < 2 ? (
        <List.EmptyView title="No Results" />
      ) : (
        Object.entries(packageSections).map(([sectionTitle, packages]) => (
          <List.Section key={sectionTitle} title={sectionTitle}>
            {packages.map((pkg, index) => (
              <List.Item
                key={`${pkg.repo}-${index}`}
                title={pkg.visiblename || pkg.binname || pkg.srcname}
                subtitle={pkg.summary || ""}
                accessories={[{ text: pkg.version }]}
                actions={
                  <ActionPanel>
                    <Action.Push
                      title="Show Details"
                      icon={Icon.AppWindowSidebarRight}
                      target={<PackageDetail pkg={pkg} />}
                    />
                    <Action.CopyToClipboard content={pkg.visiblename || pkg.binname || pkg.srcname} />
                    <Action.OpenInBrowser
                      url={`https://repology.org/projects/?search=${
                        pkg.visiblename || pkg.binname || pkg.srcname
                      }&maintainer=&category=&inrepo=${
                        pkg.repo
                      }&notinrepo=&repos=&families=&repos_newest=&families_newest=`}
                    />
                  </ActionPanel>
                }
              />
            ))}
          </List.Section>
        ))
      )}
    </List>
  );
}

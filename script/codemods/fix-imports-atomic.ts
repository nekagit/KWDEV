import { Project } from "ts-morph";

const importMap: Record<string, string> = {
    // atoms/accessible → molecules/Accessible
    "@/components/atoms/accessible/CommandPaletteAnnouncer": "@/components/molecules/Accessible/CommandPaletteAnnouncer",
    "@/components/atoms/accessible/RunStatusAnnouncer": "@/components/molecules/Accessible/RunStatusAnnouncer",
    "@/components/atoms/accessible/SkipToMainContent": "@/components/molecules/Accessible/SkipToMainContent",
    // atoms/buttons → molecules/Buttons
    "@/components/atoms/buttons/BackToTop": "@/components/molecules/Buttons/BackToTop",
    "@/components/atoms/buttons/ButtonComponent": "@/components/molecules/Buttons/ButtonComponent",
    "@/components/atoms/buttons/CreatePromptButton": "@/components/molecules/Buttons/CreatePromptButton",
    "@/components/atoms/buttons/EditPromptButton": "@/components/molecules/Buttons/EditPromptButton",
    "@/components/atoms/buttons/GeneratePromptWithAiButton": "@/components/molecules/Buttons/GeneratePromptWithAiButton",
    "@/components/atoms/buttons/PrintButton": "@/components/molecules/Buttons/PrintButton",
    // atoms/displays → molecules/Displays
    "@/components/atoms/displays/DisplayPrimitives": "@/components/molecules/Displays/DisplayPrimitives",
    "@/components/atoms/displays/RelativeTimeWithTooltip": "@/components/molecules/Displays/RelativeTimeWithTooltip",
    "@/components/atoms/displays/SidebarVersion": "@/components/molecules/Displays/SidebarVersion",
    // atoms/forms → molecules/Forms
    "@/components/atoms/forms/PromptFormFields": "@/components/molecules/Forms/PromptFormFields",
    "@/components/atoms/forms/PromptRecordGeneratorForm": "@/components/molecules/Forms/PromptRecordGeneratorForm",
    // atoms/headers → molecules/Headers
    "@/components/atoms/headers/ThemeNameHeader": "@/components/molecules/Headers/ThemeNameHeader",
    // atoms/inputs → molecules/Inputs
    "@/components/atoms/inputs/ProjectInput": "@/components/molecules/Inputs/ProjectInput",
    "@/components/atoms/inputs/ProjectTextarea": "@/components/molecules/Inputs/ProjectTextarea",
    // atoms/layout → molecules/Layout
    "@/components/atoms/layout/GridContainer": "@/components/molecules/Layout/GridContainer",
    // atoms/list-items → molecules/ListItems
    "@/components/atoms/list-items/ProjectArchitectureListItem": "@/components/molecules/ListItems/ProjectArchitectureListItem",
    "@/components/atoms/list-items/ProjectDesignListItem": "@/components/molecules/ListItems/ProjectDesignListItem",
    "@/components/atoms/list-items/PromptTableRow": "@/components/molecules/ListItems/PromptTableRow",
    // atoms/theme → molecules/Theme
    "@/components/atoms/theme/SidebarThemeLabel": "@/components/molecules/Theme/SidebarThemeLabel",
    "@/components/atoms/theme/ThemeButtonPreview": "@/components/molecules/Theme/ThemeButtonPreview",
    "@/components/atoms/theme/ThemeColorSwatches": "@/components/molecules/Theme/ThemeColorSwatches",
    "@/components/atoms/theme/ThemeIconPreview": "@/components/molecules/Theme/ThemeIconPreview",
    // atoms/visual-effects → molecules/VisualEffects
    "@/components/atoms/visual-effects/FlyingStarItem": "@/components/molecules/VisualEffects/FlyingStarItem",
    "@/components/atoms/visual-effects/LoadingPulseDot": "@/components/molecules/VisualEffects/LoadingPulseDot",
    "@/components/atoms/visual-effects/RaindropCircle": "@/components/molecules/VisualEffects/RaindropCircle",
    // TabAndContentSections → organisms/Tabs
    "@/components/molecules/TabAndContentSections/ArchitectureVisualization": "@/components/organisms/Tabs/ArchitectureVisualization",
    "@/components/molecules/TabAndContentSections/DashboardTabContent": "@/components/organisms/Tabs/DashboardTabContent",
    "@/components/molecules/TabAndContentSections/MermaidDiagram": "@/components/organisms/Tabs/MermaidDiagram",
    "@/components/molecules/TabAndContentSections/ProjectAgentsSection": "@/components/organisms/Tabs/ProjectAgentsSection",
    "@/components/molecules/TabAndContentSections/ProjectArchitectureTab": "@/components/organisms/Tabs/ProjectArchitectureTab",
    "@/components/molecules/TabAndContentSections/ProjectControlTab": "@/components/organisms/Tabs/ProjectControlTab",
    "@/components/molecules/TabAndContentSections/ProjectDesignTab": "@/components/organisms/Tabs/ProjectDesignTab",
    "@/components/molecules/TabAndContentSections/ProjectFilesTab": "@/components/organisms/Tabs/ProjectFilesTab",
    "@/components/molecules/TabAndContentSections/ProjectGitTab": "@/components/organisms/Tabs/ProjectGitTab",
    "@/components/molecules/TabAndContentSections/ProjectIdeasDocTab": "@/components/organisms/Tabs/ProjectIdeasDocTab",
    "@/components/molecules/TabAndContentSections/ProjectMilestonesTab": "@/components/organisms/Tabs/ProjectMilestonesTab",
    "@/components/molecules/TabAndContentSections/ProjectPlanTab": "@/components/organisms/Tabs/ProjectPlanTab",
    "@/components/molecules/TabAndContentSections/ProjectProjectTab": "@/components/organisms/Tabs/ProjectProjectTab",
    "@/components/molecules/TabAndContentSections/ProjectRunTab": "@/components/organisms/Tabs/ProjectRunTab",
    "@/components/molecules/TabAndContentSections/ProjectTicketsTab": "@/components/organisms/Tabs/ProjectTicketsTab",
    "@/components/molecules/TabAndContentSections/SetupDocBlock": "@/components/organisms/Tabs/SetupDocBlock",
    // AppAnalyzer → organisms/AppAnalyzer
    "@/components/molecules/AppAnalyzer/AppAnalyzerCategoryPanel": "@/components/organisms/AppAnalyzer/AppAnalyzerCategoryPanel",
    "@/components/molecules/AppAnalyzer/AuditResults": "@/components/organisms/AppAnalyzer/AuditResults",
    // DashboardsAndViews → organisms/Dashboards
    "@/components/molecules/DashboardsAndViews/SimpleDashboard": "@/components/organisms/Dashboards/SimpleDashboard",
    // UtilitiesAndHelpers → organisms/Utilities
    "@/components/molecules/UtilitiesAndHelpers/ProjectLoadingState": "@/components/organisms/Utilities/ProjectLoadingState",
    "@/components/molecules/UtilitiesAndHelpers/ShortcutsHelpDialog": "@/components/organisms/Utilities/ShortcutsHelpDialog",
    "@/components/molecules/UtilitiesAndHelpers/ThemeSelector": "@/components/organisms/Utilities/ThemeSelector",
    // Kanban → organisms/Kanban
    "@/components/molecules/Kanban/KanbanColumnCard": "@/components/organisms/Kanban/KanbanColumnCard",
    "@/components/molecules/Kanban/KanbanColumnHeader": "@/components/organisms/Kanban/KanbanColumnHeader",
    "@/components/molecules/Kanban/KanbanTicketCard": "@/components/organisms/Kanban/KanbanTicketCard",
    // DesignVisualization → organisms/DesignVisualization
    "@/components/molecules/DesignVisualization": "@/components/organisms/DesignVisualization",
    "@/components/molecules/DesignVisualization/DesignColorPalette": "@/components/organisms/DesignVisualization/DesignColorPalette",
    "@/components/molecules/DesignVisualization/DesignSamplePreview": "@/components/organisms/DesignVisualization/DesignSamplePreview",
    "@/components/molecules/DesignVisualization/DesignSectionFlow": "@/components/organisms/DesignVisualization/DesignSectionFlow",
    "@/components/molecules/DesignVisualization/DesignTypographyChart": "@/components/organisms/DesignVisualization/DesignTypographyChart",
    "@/components/molecules/DesignVisualization/DesignVisualizationFallback": "@/components/organisms/DesignVisualization/DesignVisualizationFallback",
    // ErrorBoundary → organisms/
    "@/components/ErrorBoundary": "@/components/organisms/ErrorBoundary",
};

async function main() {
    const project = new Project({ tsConfigFilePath: "tsconfig.json" });
    let fixedCount = 0;

    for (const sourceFile of project.getSourceFiles()) {
        let changed = false;
        for (const importDecl of sourceFile.getImportDeclarations()) {
            const spec = importDecl.getModuleSpecifierValue();
            if (importMap[spec]) {
                importDecl.setModuleSpecifier(importMap[spec]);
                changed = true;
                fixedCount++;
            }
        }
        if (changed) {
            console.log(`Fixed: ${sourceFile.getFilePath().replace(process.cwd(), "")}`);
        }
    }

    console.log(`\nFixed ${fixedCount} imports. Saving...`);
    await project.save();
    console.log("Done!");
}

main().catch(console.error);

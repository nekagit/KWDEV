import { Project } from "ts-morph";

// Map of old import paths -> new import paths
const importMap: Record<string, string> = {
    "@/components/shared/ButtonComponent": "@/components/atoms/buttons/ButtonComponent",
    "@/components/shared/SidebarThemeLabel": "@/components/atoms/theme/SidebarThemeLabel",
    "@/components/shared/SidebarVersion": "@/components/atoms/displays/SidebarVersion",
    "@/components/shared/SkipToMainContent": "@/components/atoms/accessible/SkipToMainContent",
    "@/components/shared/CommandPaletteAnnouncer": "@/components/atoms/accessible/CommandPaletteAnnouncer",
    "@/components/shared/RunStatusAnnouncer": "@/components/atoms/accessible/RunStatusAnnouncer",
    "@/components/shared/DisplayPrimitives": "@/components/atoms/displays/DisplayPrimitives",
    "@/components/shared/BackToTop": "@/components/atoms/buttons/BackToTop",
    "@/components/shared/GridContainer": "@/components/atoms/layout/GridContainer",
    "@/components/shared/Breadcrumb": "@/components/molecules/Navigation/Breadcrumb",
    "@/components/shared/ButtonGroup": "@/components/molecules/ControlsAndButtons/ButtonGroup",
    "@/components/shared/Card": "@/components/molecules/CardsAndDisplay/Card",
    "@/components/shared/Dialog": "@/components/molecules/FormsAndDialogs/Dialog",
    "@/components/shared/EmptyState": "@/components/molecules/Display/EmptyState",
    "@/components/shared/ErrorDisplay": "@/components/molecules/Display/ErrorDisplay",
    "@/components/shared/Form": "@/components/molecules/Form/Form",
    "@/components/shared/FormField": "@/components/molecules/Form/FormField",
    "@/components/shared/GenericInputWithLabel": "@/components/molecules/Form/GenericInputWithLabel",
    "@/components/shared/GenericTextareaWithLabel": "@/components/molecules/Form/GenericTextareaWithLabel",
    "@/components/shared/LabeledTextarea": "@/components/molecules/Form/LabeledTextarea",
    "@/components/shared/ProjectCategoryHeader": "@/components/molecules/LayoutAndNavigation/ProjectCategoryHeader",
    "@/components/shared/TerminalSlot": "@/components/molecules/Display/TerminalSlot",
    "@/components/shared/WorkerAgentCard": "@/components/molecules/CardsAndDisplay/WorkerAgentCard",
    "@/components/root-loading-overlay": "@/components/molecules/VisualEffects/RootLoadingOverlay",
    "@/components/shared/CommandPalette": "@/components/organisms/CommandPalette",
    "@/components/shared/FloatingTerminalDialog": "@/components/organisms/FloatingTerminalDialog",
    "@/components/shared/TerminalRunDock": "@/components/organisms/TerminalRunDock",
    "@/components/app-shell": "@/components/templates/AppShell",
};

async function main() {
    const project = new Project({
        tsConfigFilePath: "tsconfig.json",
    });

    let fixedCount = 0;

    for (const sourceFile of project.getSourceFiles()) {
        let changed = false;
        for (const importDecl of sourceFile.getImportDeclarations()) {
            const specifier = importDecl.getModuleSpecifierValue();
            if (importMap[specifier]) {
                importDecl.setModuleSpecifier(importMap[specifier]);
                changed = true;
                fixedCount++;
            }
        }
        if (changed) {
            console.log(`Fixed imports in: ${sourceFile.getFilePath().replace(process.cwd(), "")}`);
        }
    }

    console.log(`\nFixed ${fixedCount} import paths.`);
    console.log("Saving...");
    await project.save();
    console.log("Done!");
}

main().catch(console.error);

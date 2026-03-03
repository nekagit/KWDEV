import { Project } from "ts-morph";
import * as path from "path";

async function main() {
    const project = new Project({
        tsConfigFilePath: "tsconfig.json",
    });

    console.log("Loading files...");

    // Define the exact file moves based on the implementation plan
    const moves: { from: string; to: string }[] = [
        // Atoms
        { from: "src/components/shared/ButtonComponent.tsx", to: "src/components/atoms/buttons/ButtonComponent.tsx" },
        { from: "src/components/shared/SidebarThemeLabel.tsx", to: "src/components/atoms/theme/SidebarThemeLabel.tsx" },
        { from: "src/components/shared/SidebarVersion.tsx", to: "src/components/atoms/displays/SidebarVersion.tsx" },
        { from: "src/components/shared/SkipToMainContent.tsx", to: "src/components/atoms/accessible/SkipToMainContent.tsx" },
        { from: "src/components/shared/CommandPaletteAnnouncer.tsx", to: "src/components/atoms/accessible/CommandPaletteAnnouncer.tsx" },
        { from: "src/components/shared/RunStatusAnnouncer.tsx", to: "src/components/atoms/accessible/RunStatusAnnouncer.tsx" },
        { from: "src/components/shared/DisplayPrimitives.tsx", to: "src/components/atoms/displays/DisplayPrimitives.tsx" },
        { from: "src/components/shared/BackToTop.tsx", to: "src/components/atoms/buttons/BackToTop.tsx" },
        { from: "src/components/shared/GridContainer.tsx", to: "src/components/atoms/layout/GridContainer.tsx" },

        // Molecules
        { from: "src/components/shared/Breadcrumb.tsx", to: "src/components/molecules/Navigation/Breadcrumb.tsx" },
        { from: "src/components/shared/ButtonGroup.tsx", to: "src/components/molecules/ControlsAndButtons/ButtonGroup.tsx" },
        { from: "src/components/shared/Card.tsx", to: "src/components/molecules/CardsAndDisplay/Card.tsx" },
        { from: "src/components/shared/Dialog.tsx", to: "src/components/molecules/FormsAndDialogs/Dialog.tsx" },
        { from: "src/components/shared/EmptyState.tsx", to: "src/components/molecules/Display/EmptyState.tsx" },
        { from: "src/components/shared/ErrorDisplay.tsx", to: "src/components/molecules/Display/ErrorDisplay.tsx" },
        { from: "src/components/shared/Form.tsx", to: "src/components/molecules/Form/Form.tsx" },
        { from: "src/components/shared/FormField.tsx", to: "src/components/molecules/Form/FormField.tsx" },
        { from: "src/components/shared/GenericInputWithLabel.tsx", to: "src/components/molecules/Form/GenericInputWithLabel.tsx" },
        { from: "src/components/shared/GenericTextareaWithLabel.tsx", to: "src/components/molecules/Form/GenericTextareaWithLabel.tsx" },
        { from: "src/components/shared/LabeledTextarea.tsx", to: "src/components/molecules/Form/LabeledTextarea.tsx" },
        { from: "src/components/shared/ProjectCategoryHeader.tsx", to: "src/components/molecules/LayoutAndNavigation/ProjectCategoryHeader.tsx" },
        { from: "src/components/shared/TerminalSlot.tsx", to: "src/components/molecules/Display/TerminalSlot.tsx" },
        { from: "src/components/shared/WorkerAgentCard.tsx", to: "src/components/molecules/CardsAndDisplay/WorkerAgentCard.tsx" },
        { from: "src/components/root-loading-overlay.tsx", to: "src/components/molecules/VisualEffects/RootLoadingOverlay.tsx" },

        // Organisms
        { from: "src/components/shared/CommandPalette.tsx", to: "src/components/organisms/CommandPalette.tsx" },
        { from: "src/components/shared/FloatingTerminalDialog.tsx", to: "src/components/organisms/FloatingTerminalDialog.tsx" },
        { from: "src/components/shared/TerminalRunDock.tsx", to: "src/components/organisms/TerminalRunDock.tsx" },

        // Templates
        { from: "src/components/app-shell.tsx", to: "src/components/templates/AppShell.tsx" },
    ];

    let skippedCount = 0;
    let movedCount = 0;

    for (const move of moves) {
        const sourcePath = path.resolve(process.cwd(), move.from);
        const destPath = path.resolve(process.cwd(), move.to);
        const sourceFile = project.getSourceFile(sourcePath);

        if (sourceFile) {
            console.log(`Moving ${move.from} -> ${move.to}`);
            // ts-morph automatically rewrites imports pointing to this file!
            sourceFile.move(destPath);
            movedCount++;
        } else {
            console.log(`Skipped (not found): ${move.from}`);
            skippedCount++;
        }
    }

    console.log(`\nMoved ${movedCount} files. Skipped ${skippedCount} files.`);
    console.log("Saving changes across workspace...");

    await project.save();

    console.log("Done! Refactoring complete.");
}

main().catch(console.error);

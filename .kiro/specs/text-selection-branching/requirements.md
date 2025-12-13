# Requirements Document

## Introduction

This feature enables users to select specific text within AI responses and create targeted follow-up branches about that selection. When text is selected and branched, it becomes visually highlighted in the original response, allowing users to track which concepts they've already explored. This solves the problem of losing track of topics when exploring complex subjects with multiple branching conversations.

## Glossary

- **Selection**: A specific portion of text highlighted by the user in an AI response
- **Branch**: A child conversation node created from a parent node
- **Explored Selection**: Text that has been selected and used to create a branch, now visually marked
- **Selection Popover**: The UI component that appears when text is selected, allowing the user to ask a question
- **Disambiguation Menu**: A small menu that appears when clicking on overlapping explored selections

## Requirements

### Requirement 1: Text Selection Detection

**User Story:** As a user, I want to select text within an AI response, so that I can indicate which specific concept I want to explore further.

#### Acceptance Criteria

1. WHEN a user selects text within the AI response area of a conversation node THEN the system SHALL detect the selection and capture the selected text along with its start and end character positions
2. WHEN a user selects text THEN the system SHALL display a selection popover near the selected text within 100ms
3. WHEN a user clicks outside the selection or presses Escape THEN the system SHALL dismiss the selection popover and clear the selection state
4. WHEN a user selects text that is already part of an explored selection THEN the system SHALL still allow the new selection and show the popover
5. WHILE text is being selected THEN the system SHALL use the native browser selection styling without interference

### Requirement 2: Selection Popover Component

**User Story:** As a user, I want to see a popover when I select text, so that I can ask my specific question about that concept.

#### Acceptance Criteria

1. WHEN the selection popover appears THEN the system SHALL display the selected text as context at the top of the popover
2. WHEN the selection popover appears THEN the system SHALL provide a text input field for the user to type their question
3. WHEN the selection popover appears THEN the system SHALL provide a "Branch" button to submit the question
4. WHEN the user presses Enter in the input field THEN the system SHALL submit the question (same as clicking Branch)
5. WHEN the user submits with an empty question THEN the system SHALL prevent submission and keep the popover open
6. WHEN the popover is displayed THEN the system SHALL position it near the selection without obscuring the selected text
7. WHEN the viewport is resized or scrolled THEN the system SHALL reposition the popover to remain visible

### Requirement 3: Branch Creation from Selection

**User Story:** As a user, I want to create a new conversation branch from my selected text, so that I can explore that specific concept in depth.

#### Acceptance Criteria

1. WHEN a user submits a question from the selection popover THEN the system SHALL create a new child node with the user's question
2. WHEN a branch is created from a selection THEN the system SHALL store the selection metadata (text, startIndex, endIndex, childNodeId) in the parent node's exploredSelections array
3. WHEN a branch is created THEN the system SHALL dismiss the popover and clear the selection state
4. WHEN a branch is created THEN the system SHALL include the conversation history from root to parent for AI context
5. WHEN a branch is created THEN the system SHALL trigger the AI response generation with streaming

### Requirement 4: Explored Selection Highlighting

**User Story:** As a user, I want to see which text I've already explored, so that I can track my learning progress and avoid re-exploring the same concepts.

#### Acceptance Criteria

1. WHEN a response contains explored selections THEN the system SHALL render those text ranges with a distinct visual highlight style
2. WHEN multiple explored selections exist in a response THEN the system SHALL highlight each one independently
3. WHEN explored selections overlap THEN the system SHALL render them as a merged visual highlight covering the full range
4. WHEN rendering highlights THEN the system SHALL use a subtle but noticeable style (e.g., teal/cyan background) that doesn't interfere with readability
5. WHEN the response is rendered THEN the system SHALL preserve all markdown formatting while applying highlights

### Requirement 5: Explored Selection Interaction

**User Story:** As a user, I want to click on highlighted text to navigate to the branch that explores it, so that I can easily jump between related concepts.

#### Acceptance Criteria

1. WHEN a user clicks on an explored selection highlight THEN the system SHALL navigate to or focus on the child branch that explores that selection
2. WHEN a user clicks on a position covered by multiple overlapping selections THEN the system SHALL display a disambiguation menu listing all branches
3. WHEN the disambiguation menu is displayed THEN the system SHALL show the selected text and a link/button for each overlapping branch
4. WHEN a user selects a branch from the disambiguation menu THEN the system SHALL navigate to that branch and dismiss the menu
5. WHEN a user clicks outside the disambiguation menu THEN the system SHALL dismiss the menu without navigation

### Requirement 6: Branch Deletion Cleanup

**User Story:** As a user, I want explored selection highlights to be removed when I delete the corresponding branch, so that my highlights stay accurate.

#### Acceptance Criteria

1. WHEN a branch node is deleted THEN the system SHALL remove the corresponding entry from the parent node's exploredSelections array
2. WHEN a branch with nested children is deleted THEN the system SHALL only remove the direct selection reference, not affect grandparent nodes
3. WHEN the last explored selection is removed from a node THEN the system SHALL render the response without any highlights

### Requirement 7: Fullscreen Mode Support

**User Story:** As a user, I want text selection branching to work in fullscreen chat mode, so that I have a consistent experience regardless of view mode.

#### Acceptance Criteria

1. WHEN in fullscreen mode THEN the system SHALL allow text selection in AI responses with the same behavior as canvas mode
2. WHEN a branch is created in fullscreen mode THEN the system SHALL update the underlying canvas data and create the node
3. WHEN in fullscreen mode THEN the system SHALL display explored selection highlights in the message history
4. WHEN exiting fullscreen mode after creating selection-based branches THEN the system SHALL show the new nodes correctly positioned on the canvas

### Requirement 8: Data Persistence

**User Story:** As a user, I want my explored selections to be saved, so that I can see my exploration progress when I return to a canvas.

#### Acceptance Criteria

1. WHEN explored selections are added or removed THEN the system SHALL persist the changes to the database
2. WHEN a canvas is loaded THEN the system SHALL restore all explored selections and render highlights correctly
3. WHEN saving exploredSelections THEN the system SHALL store them as part of the node data in the existing nodes JSON structure

### Requirement 9: Selection in Questions

**User Story:** As a user, I want to select text in my own questions too, so that I can branch off to explore concepts I mentioned but didn't fully understand.

#### Acceptance Criteria

1. WHEN a user selects text within the question area of a conversation node THEN the system SHALL allow selection and show the popover
2. WHEN a branch is created from a question selection THEN the system SHALL store the selection with a flag indicating it's from the question (not response)
3. WHEN rendering a question with explored selections THEN the system SHALL highlight those selections with the same visual style as response highlights

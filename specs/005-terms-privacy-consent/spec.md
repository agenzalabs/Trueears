# Feature Specification: Terms of Service & Privacy Consent

**Feature Branch**: `005-terms-privacy-consent`
**Created**: 2026-01-16
**Status**: Draft
**Input**: User description: "Add Terms of Service and Privacy Policy with installer consent and in-app access for legal compliance"

## Overview

Trueears collects sensitive user data including microphone audio, clipboard content, and active window information. To comply with privacy regulations (GDPR, CalOPPA, PIPEDA) and establish clear user expectations, this feature introduces:

1. **Installer-based consent**: Users accept Terms of Service and Privacy Policy during Windows installation (NSIS license page)
2. **In-app access**: Users can view legal documents and data controls anytime from Settings > Legal & Privacy tab

**Implementation**: NSIS installer displays combined terms-and-privacy.txt as EULA. Settings includes Legal & Privacy tab with collapsible sections for Terms, Privacy Policy, and Data Controls.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Installer Consent (Priority: P1)

As a new user installing Trueears, I want to review and accept the Terms of Service and Privacy Policy during installation, so that I can make an informed decision before the app is installed.

**Why this priority**: This is the core legal compliance requirement. Consent at install time ensures users agree before any data collection is possible.

**Independent Test**: Run the Windows installer and verify the consent screen appears with Terms and Privacy Policy, requiring explicit acceptance to proceed.

**Acceptance Scenarios**:

1. **Given** a user runs the Trueears installer, **When** the installation wizard reaches the consent step, **Then** the Terms of Service and Privacy Policy are displayed with checkboxes or explicit accept buttons
2. **Given** the consent step is displayed, **When** the user accepts the terms, **Then** installation proceeds normally
3. **Given** the consent step is displayed, **When** the user declines or cancels, **Then** the installation is aborted with a message explaining consent is required
4. **Given** a user upgrades Trueears, **When** the terms have not changed, **Then** no re-consent is required during upgrade

---

### User Story 2 - Access Legal Documents from Settings (Priority: P1)

As an existing user, I want to review the Terms of Service, Privacy Policy, and Data Controls at any time from Settings, so that I can understand my rights and how my data is being used.

**Why this priority**: Users must have ongoing access to legal documents. This is a regulatory requirement and builds trust.

**Independent Test**: Open Settings, navigate to "Legal & Privacy" tab, verify all documents are accessible and readable.

**Acceptance Scenarios**:

1. **Given** the user is in the Settings screen, **When** the user navigates to the "Legal & Privacy" tab, **Then** links/sections for Terms of Service, Privacy Policy, and Data Controls are visible
2. **Given** the user clicks on "Terms of Service", **When** the document opens, **Then** the full legal text is displayed in a readable format (in-app or external link)
3. **Given** the user clicks on "Privacy Policy", **When** the document opens, **Then** the full legal text is displayed with clear data collection explanations
4. **Given** the user views "Data Controls", **When** the section loads, **Then** they see what data Trueears collects and any available controls
5. **Given** the user views "Data Controls", **When** the header is visible, **Then** a "Last updated" date is shown

---

### User Story 3 - Terms Update Notification (Priority: OUT OF SCOPE)

~~As an existing user, I want to be notified when the Terms of Service or Privacy Policy changes significantly, so that I can review updates that affect my data.~~

**Status**: Deferred. Version-based re-consent is complex and not required for initial release. Users can review updated terms in Settings > Legal & Privacy after app updates.

---

### Edge Cases

- What happens if installer consent data is lost/corrupted? -> App still works; consent was given at install time (legal record is the installation itself)
- How does the system handle offline viewing of legal documents? -> Documents are bundled with the app and viewable offline in Settings
- What happens during silent/enterprise installs? -> Silent installs must pass a `/ACCEPTEULA` flag or similar

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Windows installer MUST display Terms of Service and Privacy Policy and require explicit acceptance before installation proceeds
- **FR-002**: Installer MUST require explicit user action (checkbox + button or similar) to accept terms; passive acceptance is NOT sufficient
- **FR-003**: If user declines terms in installer, installation MUST abort with a clear message
- **FR-004**: Settings MUST include a "Legal & Privacy" tab accessible from the main navigation
- **FR-005**: "Legal & Privacy" tab MUST display Terms of Service (full text or link to view)
- **FR-006**: "Legal & Privacy" tab MUST display Privacy Policy (full text or link to view)
- **FR-006a**: Terms of Service and Privacy Policy entries MUST display a "Last updated" date (date only; no version label)
- **FR-007**: "Legal & Privacy" tab MUST display Data Controls section explaining what data is collected
- **FR-008**: Legal documents MUST be bundled with the app for offline access
- **FR-009**: ~~Installer upgrade SHOULD detect terms version changes and prompt for re-consent if major version changes~~ (OUT OF SCOPE)
- **FR-010**: Silent installs support `/S` flag (standard NSIS silent install)

### Content Requirements

- **CR-001**: Privacy Policy MUST clearly list all data collected: microphone audio, clipboard content, active window information, installed apps cache, API keys
- **CR-002**: Privacy Policy MUST explain how each data type is used, stored, and when it is deleted
- **CR-003**: Privacy Policy MUST disclose that audio is sent to third-party services (Groq) for transcription
- **CR-004**: Privacy Policy MUST state that API keys are stored locally using secure storage
- **CR-005**: Terms of Service MUST define acceptable use of the transcription service
- **CR-006**: Terms of Service MUST include limitation of liability and warranty disclaimer
- **CR-007**: Both documents MUST be written in plain, understandable language (target: 8th grade reading level)
- **CR-008**: Data Controls section MUST list each data type, its purpose, storage location, and retention
- **CR-008**: Data Controls section MUST list each data type, its purpose, storage location, and retention
- **CR-009**: Data Controls section MUST display a "Last updated" date (date only; no version number)

### Key Entities

- **LegalDocument**: Represents a legal document (Terms or Privacy). Contains: document type, version number, effective date, content
- **LegalDocument**: Represents a legal document (Terms or Privacy). Contains: document type, effective date (or last-updated date), content. (An internal version identifier may exist for upgrade/re-consent logic but is not required to be user-facing.)
- **DataControlItem**: Represents a data type for the Data Controls section. Contains: data type name, purpose, storage location, retention policy

## Assumptions

- Legal documents will be authored by the development team initially (not legal counsel) - professional legal review may be needed later
- Windows NSIS or similar installer framework will be used for the consent screen
- Consent is established at install time; the app trusts that installation means consent was given
- "Significant update" requiring re-consent means a major version bump (1.x -> 2.x) in terms

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of new installations require explicit consent acceptance in the installer
- **SC-002**: Legal documents are accessible from Settings within 2 clicks from the main screen
- **SC-003**: Both legal documents are readable at 8th grade level (Flesch-Kincaid score of 60-70 or higher)
- **SC-004**: All legal documents work offline (bundled with app)
- **SC-005**: Silent installs fail without `/ACCEPTEULA` flag

## Out of Scope

- Cookie consent (not applicable - desktop app, no web tracking)
- GDPR data export/deletion requests (separate feature for account management)
- Age verification or parental consent (app is general-audience)
- Multi-language legal documents (English only for initial release)
- Legal review or certification of document content
- macOS/Linux installer consent (Windows only for now)
- Frontend-based consent flow blocking app usage (moved to installer)

# Auto-update

Trueears checks for new releases in the background, downloads them automatically,
and waits for the user to restart. Nothing is installed without an explicit click.

## How it works

1. Fifteen seconds after launch (and every six hours after that) the Rust side
   asks GitHub for the latest release manifest.
2. If a newer version exists, the installer package is downloaded and held in
   memory. Progress is pushed to the UI as `update-status` events.
3. Settings → About shows "Version X is ready to install" with a **Restart &
   install** button, and a dot appears on the About tab.
4. Clicking it hands off to the NSIS installer, which replaces the app and
   relaunches it. On Windows the process exits at this point.

The backend refuses to install while the microphone is live, so an update can
never cut off a recording in progress.

### Why the checks live in Rust

The settings window is created on demand and closed often; the overlay window is
transient. Only the Rust side is guaranteed to be alive, and it is the only place
where a downloaded package can outlive the window that started the download.

## Signing

Updates are signed, and `bundle.createUpdaterArtifacts` is enabled, so every
release build needs both halves of a keypair:

- the **public key** in `backend/tauri.conf.json` under `plugins.updater.pubkey`
  (already set - it is public and belongs in the repository), and
- the **private key**, held in the `TAURI_SIGNING_PRIVATE_KEY` and
  `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` repository secrets that `release.yml`
  reads.

The CI smoke build in `ci.yml` does not use those secrets. It generates a
throwaway keypair per run and patches its public key into the config in the
workspace, so pull requests from forks - which cannot read secrets - still build.

**Back up the private key and its password.** The public key is compiled into
every shipped build. If the private key is lost, no future update can be signed
and every installed user is stranded on their current version with no path
forward except a manual reinstall.

**Never change the public key once a release has shipped.** Installed apps only
trust the key they were built with; rotating it silently cuts off everyone who
already has the app.

### Regenerating the keypair

Only safe before the first release has been published.

```bash
npm run tauri -- signer generate -w ~/.tauri/trueears.key --password '<password>' --force
```

Use a **non-empty password**. An empty one is rejected as incorrect when signing,
and an empty `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` makes the tooling drop into an
interactive prompt, which hangs unattended builds. In PowerShell, quote the
password with single quotes so nothing is interpolated.

Then copy `~/.tauri/trueears.key.pub` (a single base64 line) into
`plugins.updater.pubkey`, and update both secrets:

```bash
gh secret set TAURI_SIGNING_PRIVATE_KEY < ~/.tauri/trueears.key
printf '%s' '<password>' | gh secret set TAURI_SIGNING_PRIVATE_KEY_PASSWORD
```

### Building a release locally

Point the same two variables at your key:

```bash
TAURI_SIGNING_PRIVATE_KEY=~/.tauri/trueears.key \
TAURI_SIGNING_PRIVATE_KEY_PASSWORD="<password>" \
npm run build
```

`TAURI_SIGNING_PRIVATE_KEY` takes either the path to the key or its contents.
A successful build reports two artifacts:

```text
Finished 1 bundle at:
    .../bundle/nsis/Trueears_<version>_x64-setup.exe
Finished 1 updater signature at:
    .../bundle/nsis/Trueears_<version>_x64-setup.exe.sig
```

If the `.sig` is missing, signing failed and the release will not be installable
as an update.

## Releasing

Unchanged from before: bump `version` in `package.json` and merge to `main`.
`release.yml` tags `v<version>`, builds, and publishes the release. With signing
configured it also uploads `latest.json`, which is what installed apps read from:

```text
https://github.com/agenzalabs/Trueears/releases/latest/download/latest.json
```

## Limitations

- **Windows only.** The release matrix builds `windows-latest` alone, so Linux
  and macOS users get no updates until that expands.
- **Existing installs cannot be reached.** Builds already on users' machines have
  no updater in them. Everyone installed before the first updater-enabled release
  must update by hand once; they are on the automatic track after that.
- **Not code signing.** Without an Authenticode certificate, SmartScreen warnings
  on install are unchanged. Update signing only proves the package came from
  whoever holds the private key.

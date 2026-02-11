# Security Considerations

This document outlines the security architecture and known limitations of JellyAmp PWA.

## Browser-Only Architecture

JellyAmp is designed as a client-only Progressive Web App (PWA) with no backend server. This architectural choice provides several benefits (easy deployment, no server costs, maximum privacy) but comes with inherent security limitations that are shared by all browser-based applications.

## Known Security Limitations

### 1. API Tokens in Stream URLs (#63)

**Issue**: Jellyfin access tokens are exposed in audio stream URLs as query parameters.

**Why this exists**: HTML5 Audio elements require plain URLs in the `src` attribute and cannot use custom HTTP headers for authentication. This is a fundamental browser limitation.

**Risk level**: LOW - The token is already known to both the client and server. Primary risk is token leakage in browser history or server logs.

**Alternatives considered**:
- Service Worker proxy: Complex, poor mobile support, reliability issues
- Short-lived tokens: Requires custom Jellyfin modifications
- Backend proxy: Defeats purpose of client-only architecture

**Status**: Accepted as inherent limitation of browser-based media players.

### 2. Client-Side Credential Storage (#64)

**Issue**: Scrobbling credentials (Last.fm API keys, ListenBrainz tokens) are stored in localStorage.

**Why this exists**: Browser-only applications have no secure server-side storage. All browser storage options (localStorage, sessionStorage, IndexedDB, cookies) are accessible to JavaScript.

**Risk level**: ACCEPTABLE - Limited scope (music scrobbling only), user-initiated connections, revocable tokens, standard industry practice.

**Status**: Standard behavior for all client-side web applications.

## Security Best Practices

### For Users
1. Use JellyAmp only on trusted devices
2. Log out from shared computers
3. Revoke app permissions from Last.fm/ListenBrainz if needed
4. Keep your Jellyfin server secure and updated

### For Developers
1. Never request unnecessary permissions
2. Use secure authentication flows (OAuth)
3. Implement proper input validation
4. Keep dependencies updated
5. Use HTTPS everywhere

## Comparison with Other Services

These limitations are shared by all major browser-based music services:
- Spotify Web Player
- YouTube Music
- SoundCloud Web
- Last.fm web interface

The web platform security model accepts these trade-offs in favor of universal accessibility and ease of deployment.

## Reporting Security Issues

If you discover a security vulnerability that goes beyond these documented architectural limitations, please report it privately to the maintainers before public disclosure.
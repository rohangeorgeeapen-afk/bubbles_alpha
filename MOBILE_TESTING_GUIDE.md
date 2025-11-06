# Mobile Testing Guide

## Quick Test on Your Phone

### Method 1: Using Chrome DevTools (Desktop)
1. Open Chrome DevTools (F12)
2. Click the device toggle icon (Ctrl+Shift+M)
3. Select a mobile device from the dropdown
4. Test different screen sizes and orientations

### Method 2: Local Network Testing
1. Start the dev server: `npm run dev`
2. Find your local IP: `ipconfig` (Windows) or `ifconfig` (Mac/Linux)
3. On your phone, navigate to: `http://YOUR_IP:3000`
4. Make sure your phone and computer are on the same WiFi network

### Method 3: Using ngrok (Recommended for iOS testing)
1. Install ngrok: `npm install -g ngrok`
2. Start your dev server: `npm run dev`
3. In another terminal: `ngrok http 3000`
4. Use the provided HTTPS URL on your phone

## What to Test

### 1. Initial Load (2 minutes)
- [ ] Page loads without horizontal scroll
- [ ] Text is readable without zooming
- [ ] "Get Started" button is easily tappable
- [ ] No layout shifts during load

### 2. Authentication (2 minutes)
- [ ] Auth modal appears centered
- [ ] Input fields don't trigger unwanted zoom
- [ ] Keyboard doesn't obscure input fields
- [ ] Can easily tap between fields
- [ ] Submit button is accessible

### 3. Canvas Interaction (5 minutes)
- [ ] Can pan the canvas with one finger
- [ ] Can pinch to zoom in/out
- [ ] Nodes are properly sized (not too big/small)
- [ ] Can tap on nodes to interact
- [ ] Controls are easily tappable
- [ ] No accidental zooms when typing

### 4. Creating Conversations (3 minutes)
- [ ] Input field is accessible
- [ ] Keyboard appears properly
- [ ] Can type without zoom
- [ ] Send button is easily tappable
- [ ] New nodes appear properly sized

### 5. Follow-up Questions (3 minutes)
- [ ] Can tap/hover on nodes to show input
- [ ] Follow-up input appears properly
- [ ] Can type and send follow-ups
- [ ] New child nodes are properly positioned

### 6. Fullscreen Mode (5 minutes)
- [ ] Can tap maximize button
- [ ] Transition is smooth
- [ ] Chat messages are readable
- [ ] Input field works properly
- [ ] Keyboard doesn't break layout
- [ ] Can scroll through messages
- [ ] Can minimize back to canvas

### 7. Sidebar (2 minutes)
- [ ] Sidebar toggle button is accessible
- [ ] Sidebar slides in/out smoothly
- [ ] Overlay appears on mobile
- [ ] Can tap outside to close
- [ ] Canvas adjusts properly

### 8. Orientation Changes (2 minutes)
- [ ] Rotate to landscape - layout adjusts
- [ ] Rotate to portrait - layout adjusts
- [ ] No content is cut off
- [ ] All features remain accessible

### 9. Different Screen Sizes
Test on at least 2 devices:
- [ ] Small phone (iPhone SE, ~320px width)
- [ ] Regular phone (iPhone 12, ~390px width)
- [ ] Large phone (iPhone Pro Max, ~430px width)
- [ ] Tablet (iPad, ~768px width)

## Common Issues to Watch For

### iOS Safari Specific
- ❌ Input zoom on focus → Fixed with 16px font size
- ❌ Pull-to-refresh interference → Fixed with overscroll-behavior
- ❌ Viewport height issues → Fixed with -webkit-fill-available
- ❌ Tap delay → Fixed with touch-action

### Android Chrome Specific
- ❌ Touch scrolling lag → Fixed with hardware acceleration
- ❌ Zoom on double-tap → Fixed with touch-action
- ❌ Viewport scaling → Fixed with proper meta tag

### All Mobile Browsers
- ❌ Small touch targets → Fixed with 44px minimum
- ❌ Text too small → Fixed with responsive typography
- ❌ Horizontal scroll → Fixed with responsive widths
- ❌ Keyboard obscuring content → Fixed with proper viewport handling

## Performance Checks

### Load Time
- [ ] Initial page load < 3 seconds on 3G
- [ ] Time to interactive < 5 seconds on 3G

### Interactions
- [ ] Touch response < 100ms
- [ ] Smooth 60fps animations
- [ ] No jank when scrolling

### Memory
- [ ] No memory leaks after 5 minutes of use
- [ ] Smooth performance with 10+ nodes

## Browser Compatibility Matrix

| Feature | iOS Safari | Chrome Mobile | Firefox Mobile | Samsung Internet |
|---------|-----------|---------------|----------------|------------------|
| Touch Pan | ✅ | ✅ | ✅ | ✅ |
| Pinch Zoom | ✅ | ✅ | ✅ | ✅ |
| Virtual Keyboard | ✅ | ✅ | ✅ | ✅ |
| Fullscreen | ✅ | ✅ | ✅ | ✅ |
| Animations | ✅ | ✅ | ✅ | ✅ |
| Touch Targets | ✅ | ✅ | ✅ | ✅ |

## Accessibility Checks

- [ ] Can navigate with screen reader
- [ ] All interactive elements have labels
- [ ] Focus indicators are visible
- [ ] Color contrast meets WCAG AA
- [ ] Works with reduced motion preference

## Report Issues

If you find any issues, please note:
1. Device model and OS version
2. Browser name and version
3. Screen size and orientation
4. Steps to reproduce
5. Expected vs actual behavior
6. Screenshots if possible

## Quick Fixes for Common Issues

### Issue: Text is too small
**Fix**: Check if font-size is at least 16px for inputs

### Issue: Can't tap buttons
**Fix**: Ensure minimum 44x44px touch target

### Issue: Horizontal scroll appears
**Fix**: Check for fixed widths, use responsive units

### Issue: Keyboard covers input
**Fix**: Ensure proper viewport handling and scroll behavior

### Issue: Zoom on input focus
**Fix**: Set input font-size to 16px minimum

### Issue: Laggy animations
**Fix**: Use CSS transforms and will-change property

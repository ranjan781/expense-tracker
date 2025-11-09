// Test script for avatar upload functionality
console.log('=== Avatar Upload Test ===');

// Check if elements exist
const changeAvatarBtn = document.getElementById('changeAvatarBtn');
const avatarUpload = document.getElementById('avatarUpload');
const profileAvatarImg = document.getElementById('profileAvatarImg');

console.log('Elements check:');
console.log('- changeAvatarBtn:', !!changeAvatarBtn);
console.log('- avatarUpload:', !!avatarUpload);
console.log('- profileAvatarImg:', !!profileAvatarImg);

if (changeAvatarBtn) {
  console.log('Adding test click listener to change avatar button...');
  changeAvatarBtn.addEventListener('click', function() {
    console.log('Change avatar button clicked!');
    if (avatarUpload) {
      console.log('Triggering file input click...');
      avatarUpload.click();
    } else {
      console.error('Avatar upload input not found!');
    }
  });
}

if (avatarUpload) {
  console.log('Adding test change listener to file input...');
  avatarUpload.addEventListener('change', function(event) {
    console.log('File input changed!', event.target.files);
    const file = event.target.files[0];
    if (file) {
      console.log('File selected:', file.name, file.type, file.size);
    }
  });
}

console.log('Test setup complete. Open account settings and try uploading an avatar.');
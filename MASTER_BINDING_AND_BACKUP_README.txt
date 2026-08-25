Master Binding and Backup Update

This is a non-empty package. It contains a separate master-button binding module
and backup scripts.

1. Extract all files into E:\job\mixmind.
2. Run BACKUP_MIXMIND_BEFORE_UPDATE.bat first. It must show SUCCESS.
3. Then replace index.html and mixmind-master-test-binding.js from this package.
4. Restart with RESET_AND_START_MIXMIND_WINDOWS.bat and Ctrl+Shift+R.
5. Test Master Plan no longer uses the old inline handler. The binding removes
   that handler and calls the canonical renderer directly.

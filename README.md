For the final I wanted to create a little mini-game. Using NodeJS so that my pages can communicate with each other, my final boils down to a scavenger hunt. 
Through a combination of using custom console commands and navigating between different pages, the user must find and shut down a surveillance hub and critical 
infrastructure of a fictional government. In the real world our online privacy is slowly being stripped away. Because of this I wanted to simulate what it might 
be like if someone were to take a more direct rebellious approach to fighting government surveillance. 

Walkthrough
1. Type `help` to read the available commands
2. Type `ping` to see available pages
3. Type `open 3240` to open the Blackout page in a new tab
4. Type `scan` to enable the scan window
5. Position the Blackout page so that it is side by side with the console
6. Move the scan window around in the console and search for the hidden Page ID to Shield Service 0
7. Write down or remember the Page ID for Shield Service 0
8. Close Blackout
9. In the console type `open 6793` to open Link Maze and position it so that it is side by side with the console
10. Move the scan window around in the console and find the cell that turns yellow
11. Click the yellow cell and repeat step 10 one more time
12. Move the scan window around in the console and find the cell that turns red and read the message
13. Move the scan window to the status bar of the page
14. Remember or write down the password to Shield Service 0, you can now close Link Maze
15. In the console type `open 2695 4189` to open Shield Service 0. Read the text and click the button to enable Shield Service 0
16. Close Shield Service 0 and return to the console. Type `ping` and `help` to see the newly unscrambled Page IDs (obfuscation service 1) and unlocked commands (kill and revive)
17. Type `kill 5462` into the console to shut down Obfuscation Service 1
18. The Page IDs for Password Vault, Known FBO Services, and Deciphering Service are now unscrambled, but the former two are encrypted
19. Type `revive (deciphering)` to turn on the page, then `open (deciphering)` to open the page. Click on the button to enable the use of the `decipher` command
20. Return to the console and type `decipher 23EA` and `decipher 22AB` to decipher the Page IDs for Password Vault and Known FBO Services, respectively
21. Type `open 9194` to access the password vault. Type `scan` into the console to enable the scanning window if it is not already enabled
22. Move the scanning window around while looking at Password Vault to find and collect the passwords for Known FBO Services, FBO Surveillance Hub, FBO Critical Internal Servers and Obfuscation Service 0. Remember or write down the passwords somewhere
23. Return to the console and type `open 8875 2981` to access Known FBO Services
24. Type `scan` into the console to enable the scanning window if it is not already enabled and use the scanning window to find the Cyphered IDs for FBO Surveillance Hub, FBO Critical Internal Servers and Obfuscation Service 0. Remember or write them down somewhere
25. Use the `decipher` command on the Cyphered IDs you collected from Known FBO Services
26. Type `kill 2542 3677` `kill 7581 3475` and `kill 4781 6793` to shut down FBO Surveillance Hub, FBO Critical Internal Servers and Obfuscation Service 0
27. Congratulations, you have reached the end of this little mini-game

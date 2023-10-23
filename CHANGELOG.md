# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## Improvements
- Automate version adoption in viteclient env file
- Add Irrigation for Simone and Julia
- Store more variables in mongodb
- Add isRunning for better Display of running Countdowns

## [8.6.0.beta] - 2023-10-23
### Added
- Implementation of Socket IO to handle redis key changes and the possibility to subscribe
- Integration of subscriber in Redis Client file

## [8.5.0] - 2023-10-22
### Added
- SnackbarProvider to App.jsx
- Central handling of Snackbar

### Changed
- English messages to german

### Removed
- SnackbarProvider from Layout.jsx

## [8.4.2.beta] - 2023-10-22
### Issues
- Centralized Snackbar not working
- Still rerendering of entire layout

### Changed
- Created a countdowncard to export relative part

## [8.4.0.beta] - 2023-10-22
### Issues
- Centralized Snackbar not working
- Countdown Page not updating if buttons are pressed

### Added
- Messages for Display on frontend when countdown changes
- Implemented centralized Snackbar in Layout jsx
- Updated Hourfield and Minutefield compontent to acceppt min max parameters
- Field Validity check and inpute range for countdown fields

### Removed
- Removed some console.logs

## [8.3.1.beta] - 2023-10-22
### Issues
- Snackbar must be implemented
- Field check must be implemented for error checking and value checking
- Response from backend if error or success
- Start button does not resume countdown

### Fixed
- On press stop button, values do not get reset in redis

### Removed
- Some console.logs 

## [8.3.0] - 2023-10-22
### Issues
- Not possible to stop the countdown and go on with it after pressing start for the same topic
- Snackbar must be implemented
- Field check must be implemented for error checking and value checking
- Response from backend if error or success

### Added
- Countdown functionality ready to go for prodcution

## [8.2.1-beta] - 2023-10-22
### Fixed
- Countdown responds now correctly to signals, stop, start and reset from frontend

## [8.2.0-beta] - 2023-10-21
### Issues
- Stop and Reset countdown does not work. Functionality must be implemented in backend.

### Added
- Start, Stop and Reset button on frontend

### Fixed
- Prefix of redis values to avoid break of application

## [8.1.0-beta] - 2023-10-21
### Added
- Frontend new countdown page and new links

## [8.0.0-beta] - 2023-10-21
### Added
- Nodejs Backend to handle new Countdown functionality for every topic

## [7.4.1-beta] - 2023-10-20
### Added
- Building urlMap from mongodb

### Changed
- In scheduler.js check if zoneName is present
- Moved constants to MongoDB

## [7.4.0-beta] - 2023-10-19
### Added
- First implementation of mongodb

## [7.3.1] - 2023-10-15
### Added
- Logo to Homepage

### Changed
- 404 only visible if logged in

## [7.2.1] - 2023-10-15
### Added
- Prop for setting navmenu to invisible

### Removed
- At the moment dead links

## [7.2.0] - 2023-10-15
### Added
- New logo
- Title and close buttons for Dialogfullscreen and navmenu

### Changed
- Font size of headline

## [7.1.1] - 2023-10-15
### Fixed
- Active links also in submenues and on mobile

## [7.1.0] - 2023-10-15
### Added
- Active links to navmenu

### Changed
- Homepage now displays plant links

### Fixed
- Rainrate gets divided by 10

## [7.0.2] - 2023-10-14
### Removed
- .env.dev from automation and ai projects

## [7.0.1] - 2023-10-14
### Added
- .gitignore to nodeserver and ai projects

### Fixed
- Wrong ips because of loading of .env.dev files to final build

## [7.0.0] - 2023-10-14
### Added
- Navigation menu and new layout
- Folder structure

## [7.0.0-alpha.3] - 2023-10-14
### Added
- .env file with Version Information

### Changed
- Folder structure and .gitignore to include env files

## [7.0.0-alpha.2] - 2023-10-14
### Added
- Main homepage with picture

### Changed
- Folder structure
- Trufflehog to actions v3

## [7.0.0-alpha.1] - 2023-10-12
### Added
- Layout.jsx for centralized layout
- Creation of new NavMenu
- Creation of new Folder Structure

## [6.2.0] - 2023-10-10
### Added
- When GPT response is unclear, it will check traditionally whether to irrigate or not
- Traditional response is visible on frontend

### Fixed
- Settingspage success snackbar message for GPT Request

### Removed
- Removed some console logs

## [6.1.6] - 2023-10-09
### Fixed
- Autocomplete off for Settingspage

### Fixed
- Restructuring Dockerfile

## [6.1.5] - 2023-10-08

### Fixed
- Restructuring Dockerfile

## [6.1.4] - 2023-10-08

### Fixed
- Restructuring Dockerfile, since ai and viteclient is already silbling of nodeserver

## [6.1.3] - 2023-10-08

### Fixed
- Fixed nodejs, changed path to serve files from old structure automation/client to viteclient

## [6.1.2] - 2023-10-08

### Fixed
- Fixed Dockerfile, prod output is not folder build anymore but dist

## [6.1.1] - 2023-10-08

### Removed
- Removed old create-react-app client folder

### Fixed
- Fixed Dockerfile folder names

## [6.0.0] - 2023-10-08
### Added
- Added PropTypes for every prop in all files

### Changed
- Migration from create-react-app to vite 
- Changed Dockerfile to represent new folder names and structure

### Fixed
- Fixed all Eslint errors

## [5.3.0-alpha.1] - 2023-10-07
### Added
- Migration to vite client ongoing

### Known Issues
- Update Dockerfile to handle new file structure
- Update env dev and env prod import and url in different source files
- Check for imported npm modules and install
- Check for all files copied

## [5.2.0] - 2023-10-07
### Changed
- Changed folder structure
- Added changelog

## [5.1.0] - 2023-10-07
### Added
- Better user feedback on login page.
- Error message translation to German.
- Redesign of settings page with components.

## [5.1.0] - 2023-10-07
### Added
- Better user feedback on login page.
- Error message translation to German.
- Redesign of settings page with components.

## [5.0.2] - 2023-10-05
### Fixed
- Autocomplete deny for secret settings fields.

## [5.0.1] - 2023-10-05
### Changed
- Updated node packages to latest versions.

## [5.0.0] - 2023-10-05
### Added
- Moved secrets to Redis storage.
- Added update fields for secrets to settings page.
- Added that if GPT response is unclear, it defaults to result is true.

### Removed
- Removed `pwd.json` file, changed default password.

## [4.2.1] - 2023-09-30
### Added
- New component Loadingspinner.
- Better User Feedback by applying error colors to fields of scheduling.
- Alert and Snackbar for better User Feedback.

## [4.1.0] - 2023-09-30
### Added
- New functionality to delete scheduled tasks.
- `uuid` 4 to generate unique ids.
- To each task a unique id.
- Better styling to scheduled tasks for better distinction.

### Changed
- Some naming.
- Autosizing of textarea in GPT Response.

## [3.0.0] - 2023-09-27
### Added
- `redisclient` also to AI project.
- Edited `envswitcher` to include redis client addresses.
- New Settings page to be able to edit GPT Request from frontend.
- Inserted GPT Request in Redis.

## [2.1.3] - 2023-09-24
### Changed
- Request text to GPT.

## [2.1.2] - 2023-09-24
### Added
- Switched to GPT 3.5 turbo.
- Changed denomination `Zeitpläne` to tasks.
- Fixed `getCurrentDate()` call.
- Changed request text to GPT.

## [2.0.1] - 2023-09-23
### Changed
- Readme.

## [2.0.0] - 2023-09-23
### Added
- Migration to GPT 4 and OpenAI API v4.
- Removed to case lower in `gptChatCompletion`.
- Updated `Mui`, `testing-library`, `axios`, `joi`, `mqtt`, and `express-rate-limit`.
- New function that AI checks also weekday and month.
- New file `currentDate.js`.

## [1.2.0] - 2023-09-16
### Added
- Made the GPT Response visible to Frontend.
- Changes Loading behaviour of `BewaesserungsPage`.
- Changed GPT Response with Values.

### Removed
- Some `console.logs`.
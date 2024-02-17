# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [v16.7.1] - 2024-02-17

### Changed
- Decreased the padding-bottom of the footer for better spacing.

## [v16.7.0] - 2024-02-17

### Changed
- Updated the design of UI elements across various pages for improved user experience and consistency.

## [v16.6.0] - 2024-02-15

### Added
- Access to ventilation system.

### Changed
- CSS root styles - items are no longer centered by default.
- Redesign of `LoginPage`.

### Removed
- `loading` prop from `Layout` and `VillaAnnaMarkisePage`.

## [v16.5.1] - 2024-02-14

### Changed
- Changed the duration of JWT tokens in the production environment to 24 hours.
- Modified the behavior of clicking the "Heizung" link to call the refreshToken route for a fresh forward-auth token.

## [v16.5.0] - 2024-02-13

### Added
- Added access to heating system

## [v16.4.5] - 2024-02-12

### Fixed
- Fixed behaviour of forwardAuth middleware and cookie

## [v16.4.0] - 2024-02-12

### Added
- New endpoint `forwardAuth` for Traefik forward authentication support.

### Changed
- Updated the ChatGPT model to enhance performance and accuracy.

## [v16.3.0] - 2024-11-02

### Added
- `UserPage` component to display user information.
- New API endpoint `userData`.

### Removed
- State variable `previousLastLogin` stored in localStorage.

### Fixed
- Added `$eq` operator to MongoDB queries.

## [v16.2.1] - 2024-02-10

### Added
- Added npm package `helmet` to set secure HTTP headers.

### Removed
- Removed test files and `puppeteer` dependency.

## [v16.2.0] - 2024-02-10

### Added
- Input validation for refreshToken, role cookie, deviceId, and username.

## [v16.1.0] - 2024-02-09

### Added
- Added deviceId localStorage item information to allow multiple devices for one user.

### Changed
- The root route `/` in App.tsx is now `/home`.
- Token refresh now happens in `useCountdown` 10 seconds before expiry.

### Removed
- Removed all refreshToken validation and verifyToken validation from `LoginPage` to avoid any issues.

## [v16.0.1] - 2024-02-08

### Added
- Automatic token refresh attempt in `useCountdown` file.

### Fixed
- Resolved an endless loop issue in `axiosSetup`.

## [v16.0.0] - 2024-02-06

### Added
- Display of token expiry on frontend for admins.
- New state in user store for logout process.
- Encryption for role cookie.

### Changed
- Added severity level to backend messages for improved clarity.
- Reordered API structure, moving session API above AuthMiddleware.
- Modified user authentication flow to store 'Last Login' information in browser's localStorage.
- Completely refactored the authentication mechanism to replace sessions with JWT Tokens.
- Display countdown expiry in red.
- User role now handled through cookie instead of localStorage.
- Cleaned up code by removing some comments and changing the order of some code lines.
- Refactored `AuthGuard` component.
- Only display expired text in red in `Layout`.
- Changed ESLint rules for exhaustive-deps in React hooks.
- `SocketProvider` now checks for a valid JWT token before requesting a new one.
- Added new Zustand store function `setTokenAndExpiry`.

### Removed
- Removed `react-cookie` and `jwt-decode` dependencies as they are no longer needed.

### Fixed
- Fixed numerous authentication errors and misbehaviors.

## [v15.20.0] - 2024-01-28

### Added
- Additional translations for various modules.
- Last login registration for each user, stored in MongoDB.
- New parameter sent to the frontend for displaying last login information in UI components.
- Implementation of `dateUtils` for converting dates to local formats using npm moment.

### Changed
- Refactored `DialogFullScreen` component for improved styling, aligning better with Material-UI design principles.
- Removed `Textarea` from `VillaAnnaBewaesserungPage` and introduced a modal window for displaying AI responses.
- Updated MongoDB storage method for user logins to use Unix timestamp format.

## [v15.19.4] - 2024-01-27

### Changed
- Refactored `DialogFullScreen` component for improved styling and better adherence to Material-UI design principles.
- Removed `Textarea` from `VillaAnnaBewaesserungPage` and moved AI Response display to a modal window.

## [v15.19.2] - 2024-01-27

### Fixed
- Corrected issue where GPTChat completion was executing on `VillaAnnaMarkisePage`.

## [v15.19.1] - 2024-01-27

### Added
- Added more translations.
- Added more TypeScript types.

### Changed
- Changed GPT model and role of GPT model.

## [v15.19.0] - 2024-01-25
- Changelog with new version

### Added
- New `useStableTranslation` hook with callback to minimize rerenders when using translations in `useEffect` hooks.
- Translation support in `AuthGuard`.
- Translation of all messages in `SettingsPage` by implementing a mapping function to relay keys to messages in backend.

### Fixed
- Updated `SettingsPage` to ensure that changing the admin password also sets the correct role in vault.

## [v15.18.1] - 2024-01-23

### Added
- Added i18n for translation between english and german
- More translations added

### Changed
- Dependency updates

### Removed
- Deleted `TimeDisplay` and removed code from `NavMenu`

## [v15.17.0] - 2024-01-21

### Added
- Added `LoadingButton` to `LoginPage` for better user feedback.

### Changed
- Centered logos on small screens.
- Changed size and padding of title in `Layout`, made it responsive.

### Fixed
- Fixed multiple renders of React layout due to `showSnackbar` in dependency array of `AuthGuard`. Implemented useRef to optimize rendering.

## [v15.16.0] - 2024-01-21

### Added
- `rows` prop to `TextField` to fix rerender bug.
- Role-based authentication for multiple user roles.
- Display of user information in `NavMenu` instead of time.
- Npm package `Zustand` for role validation on frontend.
- Logout function.
- Snackbar message for successful login.
- Persistent storage in `localStorage` for `Zustand` state management to save user roles.
- Refactoring of session route in backend.
- Snackbar to display "Logged out" message.

### Changed
- Redesigned `Homepage` to include images as buttons.
- Countdown text in `VillaAnnaCountdownPage` set to default font family.
- Added new state `isRoleChecking` in `Authguard` for loading spinner display until role check, avoiding brief display of hidden sections.
- Dependencies updates.
- Replaced alert message on login form with snackbar alert messages.

## [v15.15.0] - 2024-01-18
### Added
- Added Images in `VillaAnnaHomePage` for better navigation

### Changed
- Increased width of drawer in `NavMenu` to 60%.
- Increased font size of `ListItemButton` to 1.2em.
- Set padding options in single pages
- Changed Card variants to outlined

## [v15.14.0] - 2024-01-16
### Added
- New utility file `useSnackbar` for reducing code duplication.

### Changed
- Applying default MUI design
- Updated `Layout` component: set container max-width to 'sm' and removed `Box` element.
- Updated `Layout` component: set container max-width to 700px.

### Fixed
- Fixed error handling in `showSnackbar`: corrected an issue where an unrelated error message from `SchedulerTaskCard` was displayed when `showSnackbar` was used outside of `SnackbarProvider`.

### Removed
- Removed `BackButton` component, as it became redundant with the implementation of `NavMenu`.
- Removed height of Appbar in `NavMenu` to 64px to maintain consistency between mobile and desktop

## [v15.13.1] - 2024-01-13
### Fixed
- Fixed `skeleton` to show on small screens a bigger loading area to avoid layout shift.

## [v15.13.0] - 2024-01-12
### Added
- New `types` folder containing a `types.ts` file for centralized type definitions.
- Grouping of tasks in `ScheduledTaskCard`, grouping tasks with the same day and month, highlighted with a border.
- Tabs in `VillaAnnaBewaesserungPage` for easy navigation between different zones, displaying the earliest month as the first task.
- Added new file `skeleton.tsx` for different loading animations.

### Changed
- Changed in `VillaAnnaBewaesserungsPage` from Loadingspinner to skeleton to avoid layout shift.
- Changed styling of Tabs to fit for mobile and large screens in `VillaAnnaBewaesserungPage`.

### Removed
- Types and interfaces declarations from all TypeScript files, now consolidated in the `types.ts` file for improved structure clarity.

## [v15.12.0] - 2024-01-07
### Added
- In `TimeDisplay`, added the display of the year.
- Added a copy function to `VillaAnnaBVewaesserungPage` and `VillaAnnaMarkisePage` for copying tasks.

### Fixed
- Fixed incorrect display of task labels in `VillaAnnaMarkisePage`.

## [v15.11.0] - 2023-12-31
### Added
- `TimeDisplay` on the right side of `NavMenu`
- In `Button`, added the possibility to pass a `customWidth` prop
- Added margin in `SecretField`

### Changed
- In `LoginPage`, changed default Mui Button to `CustomButton`
- Changed `Button` width in 'sm' to 311 px
- Changed `customWidth` in `HomePage` and `VillaAnnaHomePage`

### Fixed
- Hover color of `NavMenu` buttons on big screens
- When a task is deleted, it now also cancels the job in node-scheduler

### Removed
- In `VillaAnnaCountdownPage`, removed `console.log`

## [v15.10.0] - 2023-12-30
### Added
- Added `Button.tsx` for a CustomButton
- Added width in `Button.tsx` to handle small screens
- Added outlined prop to `Button.tsx` and also error color

### Changed
- Changed the Colorpalette of Buttons and Navmenu on mobile and big screens
- Changed the size of Titles to a smaller size
- Changed Buttons of `VillaAnnaCountdownPage` with new CustomButtons
- Changed Buttons of `DialogFullScreen`, `OnpressSwitchComponent`, `SchedulerCard` and `VillaAnnaMarkisePage` with new CustomButtons
- Changed marginbottom in `Layout.tsx`
- Changed Inputlabel in `SchedulerCard` to shrink false
- Changed marginRight in `NavMenu` to 25 px

### Fixed
- When in sublink of /villa-anna/ Route, the button remains active

### Removed
- In `LoginPage` removed universal-cookie npm module and switched to react-cookie

## [v15.9.0] - 2023-12-28
### Added
- Set secure cookie flag in `LoginPage` for more security

### Changed
- Added margin to the buttons in `NavMenu`

### Fixed
- Refactor of Authguard to avoid rendering error

## [v15.8.3] - 2023-12-28
### Changed
- Changed favicon.ico from Vite to automation logo

## [v15.8.2] - 2023-12-28
### Fixed
- Fixed in `nodebackend` `index.ts` file to point to new folder structure `viteclientts`

## [v15.8.1] - 2023-12-28
### Removed
- Removed `viteclient` folder with old JavaScript files

## [v15.8.0] - 2023-12-28
### Added
- New `viteclientts` folder for migrating `viteclient` from JavaScript to TypeScript
- Copied `images` folder to the new `viteclientts` folder
- Added CSS for devices < 600 px to have 0 padding on root

### Changed
- Updated project setup to include basic Vite TypeScript installation, enhancing development environment and build process
- Migrated `BackButton`, `constants`, and `LoadingSpinner` components from JavaScript to TypeScript
- Migrated `MinuteField`, `MonthsSelect`, `OnPressSwitchComponent`, `SecretField` and `switchCompontent` components from JavaScript to TypeScript
- Migrated `AuthGuard` component from JavaScript to TypeScript
- Migrated `CountdownCard`, `DialogFullScreen`, `timeCalculator`, and `WeekdaysSelect` components from JavaScript to TypeScript
- Changed dependabot.yml to check depencies of new viteclientts folder
- Migrated `CentralizedSnackbar`, `SnackbarContext` and `SocketContext` components from JavaScript to TypeScript
- Migrated `NavMenu` component from JavaScript to TypeScript
- Migrated `index`, `ScheduledTaskCard` and `SchedulerCard` components from JavaScript to TypeScript
- Modified Types of setSelectedHour and setSelectedMinute to strings
- Migrated `Layout` and `ErrorBoundary` from JavaScript to TypeScript
- Migrated `404Page`, `Homepage`, `LoginPage` and `SettingsPage` from JavaScript to TypeScript
- Replaced react-cookie with universal-cookie to avoid Typescript error in `Loginpage`
- Migrated `VillaAnnaCountdownPage`and `VillaAnnaHomePage` from JavaScript to TypeScript
- Migrated `App`, `VillaAnnaBewaesserungPage`, `VillaAnnaMarkisePage`, and `VillaAnnaRoutes` from JavaScript to TypeScript
- `index.css` changed backgroundcolor to darkgrey and hover to whitesmoke
- In `Layout.tsx` removed footer and used an div tag instead to achieve desired footer behaviour
- Changed color of arrow and text in `BackButton`
- Changed `Dockerfile` folder name from viteclient to viteclientts

### Removed
- Removed console.log statements from `VillaAnnaCountdownPage`
- Removed viteclient folder from dependabot
- Removed folder assets

### Fixed
- Backbutton being transparent
- HourFiled and MinuteFiel now allow deletion of values
- Moved Socketprovider in `App` to Routes behind Authguard to avoid rendering errors

## [v15.7.2] - 2023-12-25
### Changed
- Updated npm packages for bug fixes and performance improvements

## [v15.7.1] - 2023-12-25
### Fixed
- Changed Dockerfile CMD command to "build/index.js" from "index.js".

## [v15.7.0] - 2023-12-25
### Changed
- Migrated `mqttHandler` to Typescript.
- Migrated `index.js` to Typescript.
- Migrated `api.js` to Typescript.
- Migrated `mqttRoute.js` to Typescript.
- Migrated `markiseBlock.js` to Typescript.
- Changed Dockerfile to reflect new folder structure and node backend as main work directory.

### Removed
- `nodeserver` folder, all backend files are now in TypeScript and migrated into `nodebackend` folder.
- Test files `authMiddleware.test.js` and `routes.loginroute.test.js`.

## [v15.6.0] - 2023-12-25
### Changed
- Migrated `getTaskEnablerRoute` to TypeScript for improved type safety and maintainability.
- Migrated scheduler to TypeScript.
- Modified `schedulerTask` function to now accept an object as `recurrenceRule`, enhancing flexibility in scheduling tasks.
- Migrated `schedulerRoute` to TypeScript.
- Migrated `scheduledTasksRoute` to TypeScript.
- Merged `config` with `configs` and migrated `config` to TypeScript.
- Merged JS `influxdb-client` into TS `influxdb-client`.

## [v15.5.0] - 2023-12-17
### Added
- Added second toggle for 'lukas west' switch to turn it off during Puppeteer test runs.

### Changed
- Migrated multiple routes to TypeScript (TS): simpleapiRoute, deleteTaskRoute, getSecretsRoute, sessionRoute, switchTaskEnablerRoute, countdownRoute, getGptRequestRoute, loginRoute, markiseStatusRoute, updateGptRequestRoute, and countdown.

### Fixed
- Fixed association between `zoneName` and `taskId` to ensure correct task deletion.

### Removed
- Removed `passwordHasher.js` file.

## [v15.4.0] 2023-12-10
### Changed
- Migration of mongoClient, buildUrlMap and mqttPublisher to TS
- Migration of authMiddleware and socketConfig to TS
- Migration of rateLimiter and getTaskEnabler to TS
- Migration of switchTaskEnabler to TS
- Migration of mqttClient to TS
- Migration of authMiddlewareSocket to TS
- Migration of sharedState to TS
- Migration of updateSecretsRoute, sseHandler to TS
- Puppeteer test now checks for response not for UI changes

### Added
- id and name field for frontend
- id and name field to Settingspage GPT Request

## [v15.3.0] 2023-12-08
### Removed
- AI folder, migrated to nodebackend.
- Removed exclusion of test folder from tsconfig.

### Changed
- Dockerfile to match new folder and project structure.
- Migration of constants to `constants.ts`.
- Migration of `generateUniqueId` to TypeScript.
- Excluded tests folder from build.
- Renamed folder 'tests' to 'test'.
- Set `testMatch` in package.json to avoid running tests twice.
- Migration of inputValidation to TS

### Added
- Extended test case with Puppeteer to click a switch.
- Extended test case with Puppeteer to toggle switch on and off

## [v15.2.1] 2023-12-02
### Changed
- Migration of influxdb-client to TS
- Migration of traditonalcheck.js to TS
- Changed export of redisClient.ts
- Migration of gptchatcompletion to TS

### Added
- Puppeteer and test cases

## [v15.1.3] 2023-11-26
### Changed
- Moved config from ai folder to nodebackend folder converting to typescript
- Migrated listGPTModels
- Folder adaption, moved clients to /clients
- Migration of currentdate and fluqueries to TS

## [v15.0.3] 2023-11-24
### Fixed
- Dockerfile to suite new folder names

## [v15.0.2] 2023-11-24
### Changed
- Changed name of shared folder to nodebackend for future main typescript folder
- Dependencies updates

## [v15.0.0] 2023-11-20
### Added
- Typescript types for modules

### Changed
- JS files in shared folder migration to TS
- Import path for js files to build/ folder
- More path changing adapting to typescript setup
- Further path changes for default in rquire const statement
- Migration of redisclient to typescript
- Logger now only logs to console, removed file
- Display of snackbar to bottom left
- Migration of shared library completed
- Dockerfile

## [v14.0.0] - 2023-11-17
### Added
- Winston logger
- Added more login

## [v13.1.2] - 2023-11-11
### Added
- authMiddleware jest test

### Fixed
- Loading of task boarder in Markisepage

## [v13.1.1] - 2023-11-10
### Changed
- Dependencies updates

## [v13.0.2.beta] - 2023-11-10
### Changed
- Dockerfile to only install prod Dependencies

## [v13.0.1.beta] - 2023-11-10
### Added
- Jest and supertest to make tests available

### Changed
- Position of Snackbar

### Fixed
- Villa Anna Markise Page will now show snackbar

## [v12.3.1] - 2023-11-07
### Changed
- Dockerfile to meet new structure

## [v12.3.0.beta] - 2023-11-07
### Known Issues
- Dockerfile needs to be adapted to handle new shared library

### Changed
- Settings page now working with vault secretmanagement.

## [v12.2.0.beta] - 2023-11-06
### Known Issues
- Settings page not working with secret updates. Code needs to be refactored using Vault.
- Dockerfile needs to be adapted to handle new shared library

### Added
- Furter improvement of storing secrets in Vault

## [v12.1.0.beta] - 2023-11-05
### Added
- Vault client to handle secrets in Vault
- Created new shared library to create only once shared code for both nodeserver and ai projects

## [v12.0.0.beta] - 2023-11-05
### Added
- Vault client to handle secrets in Vault
- Created new shared library to create only once shared code for both nodeserver and ai projects

## [v11.0.0] - 2023-11-03
### Changed
- Replaced axios with mqtt on backend

## [v11.0.0.beta] - 2023-10-31
### Issues
- Naming of topics, what is the mqtt strategy

### Added
- Implementation of mosquitto to handle network errors

## [v10.1.0] - 2023-10-31
### Added
- ErrorBoundary to frontend to catch render errors
- Severity prop for Snackbar
- Dependencies updates

## [v10.0.0] - 2023-10-29
### Changed
- Api endpoints, creating separat files for endpoints
- Indroducing new api.js file with definition of all routes
- Moved all routes from index.js to api.js

## [v9.1.0] - 2023-10-28 
### Added
- Ratelimiting for every api endpoint

### Changed
- Redis pub / sub provide value to improve performance

## [v9.0.2] - 2023-10-28 
### Fixed
- Value of windhandler set to 20

## [v9.0.1] - 2023-10-28 
### Fixed
- Throttling time in markiseblock.js

## [v9.0.0] - 2023-10-28 
### Added
- Display Weather blocking conditions on Markisepage
- New route handler for markisestatus
- New namespace.js file to handle rediskeys to not get namingconflicts
- New prop color for switchcomponent

### Changed
- mongo user and pass stored in env variable to avoid conflicts

## [v8.12.2] - 2023-10-26
### Fixed
- Socket connection only established if cookie is set

## [v8.12.1] - 2023-10-26
### Fixed
- Redis client of ai project to use password

## [v8.12.0] - 2023-10-26
### Changed
- Added password authentication to redis

## [v8.11.0] - 2023-10-25
### Changed
- Centralized Socket Provider

## [8.10.0] - 2023-10-25
### Changed
- Different logo
- Set logo in layout to display it on every page in a footer

## [8.9.0] - 2023-10-24
### Changed
- Styling of countdown times

## [8.8.1] - 2023-10-24
### Changed
- Dockerfile to create a .env file with version from git push tag
- Workflow to include version

## [8.8.0] - 2023-10-24
### Added
- Authentication for socket.io

## [8.7.0] - 2023-10-23
### Issues
- Set Credentials and origin in socket io

### Added
- On Redis sub / pub message Frontend gets updated in countdownpage

### Fixed
- Set CORS Origin to true in socket io httpserver

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
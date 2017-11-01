INSTALLATION
-------------

Add the folder ca.ubc.ece.frolino.holocronjs to your Brackets extension folder (make sure you install Brackets if you haven't already done so). If you're using a Mac, this is usually found in /Users/[username]/Library/Application Support/Brackets/extensions/user. Henceforth, we will refer to [root] as the ca.ubc.ece.frolino.holocronjs folder.

Once you've added the folder as instructed, go to [root]/lib/utils.js, and change the FULL_PATH_TO_PLUGIN property's value to the full path to [root] (make sure you include a "/" at the end of the string).

If you had Brackets open while doing the above, restart it.

USE
----

Once in Brackets, open the developer tools by going to Debug > Show Developer Tools. In the Developer Tools window, make sure the console is open (e.g., by clicking on the Console tab at the top of the window).

Go back to the main Brackets window and start Holocron by going to Help > Try to Find Subtrees (note: this naming scheme will be changed in later revisions). This will bring up a form, where you can enter your input.

- In the "Type Directory" input box, type (or paste) the *full* path of the root directory of the web application you want Holocron to analyze
- If you would like Holocron to use example applications from the web in its analysis, check the "Use Sample Apps" checkbox. Otherwise, leave it blank.
- Choose the framework being used by the web application under test (the default is AngularJS. Also, if you click "Detect Automatically", it will also currently default to AngularJS)

Click OK to start the analysis. You can see the progress of Holocron in the console in the Developer Tools window. To read the results, you can analyze the final array output in the console (note: in the future, this array will be output to the Brackets window itself. We just decided to do things more simply with our prototype due to time constraints).
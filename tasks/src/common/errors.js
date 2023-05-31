import fsExtraPkg from "fs-extra";
const { readJSON } = fsExtraPkg;
import errorDefinitions from "/srv/configuration/error-definitions.json" assert { type: "json" };

export function expandError(error) {
    /*

    The error-definitions.json file lists various types of recognisable Error, and for each type of Error,
    it provides a number of properties which can be used to decorate or "expand" any errors of that type.

    A given entry in the error-definitions array matches a given Error object if the Error has properties
    that match ALL the properties in the definition's 'matchingProperties' object.

    NB The keys in the 'matchingProperties' object are effectively pathnames with "." as a delimiter.
    e.g. a key such as 'errorObject.foo' would get the 'errorObject' property of the currrent error, and
    then return the 'foo' property of that object.

    ALL matching definitions will be used to expand the original error.

    The matching definitions are processed in order of increasing specificity, i.e. definitions with more
    "matchingProperties" are more specific so they will be processed last. This ensures that the expanded
    error ends up with the most specific error message, code, links, etc, from all its matching definitions.
    If two definitions have the same specificity, then the one which appears later in the file overrides the
    earlier one.

    •If the matching definition has a "messageTemplate" property, it's treated as a template,
        containing placeholders that refer to properties of the error; expanding the template dereferences
        those property names, and produces a new error message that's assigned to the error's "message"
        property. For details of how the placeholders work, see the expandTemplate function below.
    •If the matching definition has a "name" or "url" property, it's simply copied to the error.

    */

    // Find the error definitions matching this error in the error-definitions file, and
    // sort the matching definitions by specificity, with the LEAST specific matches first.
    // We then process the matching error definitions in order of increasing specificity,
    // and copy their properties to the error object, thereby ensuring that the error
    // ends up with the MOST specific error message, error code, links, etc.
    let matchingErrorDefinitions = errorDefinitions
        .filter((errorDefinition) => errorMatchesDefinition(error, errorDefinition))
        // If the comparator function returns a negative number then X comes before Y
        .sort(
            (x, y) =>
                Object.keys(x.matchingProperties).length - Object.keys(y.matchingProperties).length
        );
    // If a matching definition is found, use the error definition's message template to generate a new message property
    // console.log(`Expanding error ${JSON.stringify(error, null, "  ")}`);
    // console.log(`Found ${matchingErrorDefinitions.length} matching error definition(s)`);
    matchingErrorDefinitions.forEach(function (matchingErrorDefinition) {
        // console.log(`Error definition: ${JSON.stringify(matchingErrorDefinition, null, "   ")}`);
        // expand the error message using the template of the matching error definition
        if (matchingErrorDefinition.messageTemplate !== undefined) {
            error.message = expandTemplate(matchingErrorDefinition.messageTemplate, error);
        }
        // rename the error if the matching error definition provides a new name
        if (matchingErrorDefinition.name !== undefined) {
            error.name = matchingErrorDefinition.name;
        }
        // copy the url from the matching error definition
        if (matchingErrorDefinition.url !== undefined) {
            error.url = matchingErrorDefinition.url;
        }
        //console.log(`Error is now ${JSON.stringify(error, null, "   ")}`);
    });

    // return the (possibly updated) error
    return error;
}

function errorMatchesDefinition(error, errorDefinition) {
    // Tests whether the errorDefinition matches the error
    // for now, this is just a matter of checking that error has properties matching every one of
    // the properties in the errorDefinition's matchingProperties object.
    // Potentially this could be extended to also check merely for the existence of certain properties,
    // or to do regex matches on property values, etc, by adding 'has-properties' and 'regex-matching-properties'
    // to the error definitions.
    return Object.keys(errorDefinition.matchingProperties).every(
        (key) => getProperty(error, key) == errorDefinition.matchingProperties[key]
    );
}

function expandTemplate(template, object) {
    /* Expand the template string, replacing values enclosed in braces with the correspondingly-named property of object, e.g.
    expandTemplate(
        "Invalid date '${date}' found in document {document}",
        {
            'invalid-date': '2022-13-01',
            'document': 'bogus.doc'
        }
    )  ⇒ "Invalid date '2022-13-01' found in document bogus.doc"
    */
    const expansion = template.replace(/\$\{([^}]+)\}/g, function (match, propertyPath) {
        return getProperty(object, propertyPath);
    });
    return expansion;
}

/*
Get a named property from an object.
To extract properties of nested objects, using '.' to separate property names of parent and child (etc) objects
e.g.
    getProperty({foo: {bar: 'baz'}}, 'foo.bar') ⇒ 'baz'
*/
function getProperty(object, propertyPath) {
    //console.log(`Getting property "${propertyPath}" from ${object}...`);
    let dotPosition = propertyPath.indexOf(".");
    if (dotPosition == -1) {
        // simple property lookup
        return object[propertyPath];
    } else {
        // nested property
        let childObjectKey = propertyPath.substring(0, dotPosition);
        let childObject = object[childObjectKey];
        if (childObject !== null) {
            return getProperty(childObject, propertyPath.substring(dotPosition + 1));
        } else {
            return null;
        }
    }
}

import { readJSON } from "fs-extra";

export async function expandError(error) {
    /* 
    
    The error-definitions.json file lists various types of recognisable Error, and for each type of Error, 
    it provides a template string which can be used to generate a new "message" property for errors 
    of that type.
    
    A given entry in the error-definitions array matches a given Error object if the Error has properties 
    that match all the properties in the definition's 'matchingProperties' object.
    
    Error definitions are listed in order of descending priority. The first matching definition will be 
    used to expand the error:
    
    •If the matching definition has a "name" property, it's assigned to the error
    •If the matching definition has a "messageTemplate" property, it's treated as a template, 
        containing placeholders that refer to properties of the error; expanding the template dereferences
        those property names, and produces a new error message that's assigned to the error's "message" 
        property.
        
    */
    
    let errorDefinitions = await readJSON('/srv/configuration/error-definitions.json');
    // Find the first error definition matching this error in the error-definitions.
    let matchingErrorDefinition = errorDefinitions.filter(errorDefinition => errorMatchesDefinition(error, errorDefinition))[0];
    // If a matching definition is found, use the error definition's message template to generate a new message property
    if (matchingErrorDefinition !== undefined) {
        // expand the error message using the template of the matching error definition
        if (matchingErrorDefinition.messageTemplate !== undefined) {
            error.message = expandTemplate(matchingErrorDefinition.messageTemplate, error);
        }
        // rename the error if the matching error definition provides a new name
        if (matchingErrorDefinition.name !== undefined) {
            error.name = matchingErrorDefinition.name;
        }
    }
    
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
    return Object
        .keys(errorDefinition.matchingProperties)
        .every(key => error[key] == errorDefinition.matchingProperties[key]);
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
    const expansion = template.replace(
        /\$\{([^}]+)\}/g,
        function(match, propertyPath) {
            return getProperty(object, propertyPath);
        }
    );
    return expansion;
}

/*
Get a named property from an object.
To extract properties of nested objects, using '.' to separate property names of parent and child (etc) objects
e.g.
    getProperty({foo: {bar: 'baz'}}, 'foo.bar') ⇒ 'baz'
*/
function getProperty(object, propertyPath) {
    let dotPosition = propertyPath.indexOf('.'); 
    if (dotPosition == -1) {
        // simple property lookup
        return object[propertyPath];
    } else {
        // nested property
        let childObjectKey = propertyPath.substring(0, dotPosition);
        let childObject = object[childObjectKey];
        if (childObject !== undefined) {
            return getProperty(childObject, propertyPath.substring(dotPosition + 1));
        } else {
            return undefined;
        }
    }
}


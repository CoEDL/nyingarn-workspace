//import fetch, { FormData, File, fileFrom } from 'node-fetch'
import {fileFromPath} from 'formdata-node/file-from-path';
import axios from 'axios';
import { DOMParser } from 'xmldom';
import fsExtra from 'fs-extra';
const { writeFile } = fsExtra;

test();

export async function test() {
	try {
		const form = new FormData();
		const filePath = "/srv/tasks/src/test-data/Succeeds-ftp-upload/Bates34/Bates34-tei.xml";
		form.append("identifier", "Bates34");
		form.append("page-identifier-regex", ".*");
		const source = await fileFromPath(filePath, "Bates34", {type: "application/xml"});
		form.append("source", source);
		const {data} = await axios.postForm('http://xml:8080/nyingarn/ingest-tei', form);
		const surfacesDocument = new DOMParser().parseFromString(data, 'application/xml');
		const directoryElement = surfacesDocument.documentElement;
		const childNodes = directoryElement.childNodes;
		console.log(childNodes.length);
		console.log(childNodes[0]);
		for (var i = 0; i < childNodes.length; i++) {
			var childNode = childNodes[i];
			if (childNode.nodeType === 1) {
				// childNode is a c:file element
				var fileName = childNode.getAttribute("name");
				
				console.log(fileName);
				writeFile(
				  `/tmp/${fileName}`, 
				  serializer.serializeToString(childNode), 
				  function(error) {
					if (error) {
					  console.log(error);
					} else {
					  console.log(`Surface file ${fileName} saved`);
					}
				  }
				); 				
			}
		}
	} catch (error) {
		console.log(error);
	}
}
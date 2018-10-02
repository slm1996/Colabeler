/**
 * Created by chenyi on 2018/4/27.
 */
function formatDoc(doc){
    let path_components = shenjian.path.parse(doc.path)
    let objectXML = "";
    for (let i in doc.outputs.object) {
        var object = doc.outputs.object[i];
        let shapeXML = "";
        if (object.bndbox) {
            shapeXML =
                `<bndbox>
        <xmin>${object.bndbox.xmin}</xmin>
        <ymin>${object.bndbox.ymin}</ymin>
        <xmax>${object.bndbox.xmax}</xmax>
        <ymax>${object.bndbox.ymax}</ymax>
    </bndbox>`
        } else if (object.keyframes) {
            for (let j in object.keyframes) {
                let bndbox = object.keyframes[j];
                shapeXML +=
                    `<bndbox>
        <time>${bndbox.time}</time>
        <xmin>${bndbox.xmin}</xmin>
        <ymin>${bndbox.ymin}</ymin>
        <xmax>${bndbox.xmax}</xmax>
        <ymax>${bndbox.ymax}</ymax>
    </bndbox>`
            }
        } else if (object.polygon) {
            shapeXML = "<polygon>\n";
            let len = Object.keys(object.polygon).length;
            for (let j = 1; j <= len / 2; j++) {
                shapeXML += `\t\t\t<x${j}>${object.polygon["x" + j]}</x${j}>\n`;
                shapeXML += `\t\t\t<y${j}>${object.polygon["y" + j]}</y${j}>\n`;
            }
            shapeXML += "\t\t</polygon>"
        } else if (object.cubic_bezier) {
            shapeXML = "<cubic_bezier>\n";
            let len = Object.keys(object.cubic_bezier).length;
            for (let j = 1; j <= len / 6; j++) {
                shapeXML += `\t\t\t<x${j}>${object.cubic_bezier["x" + j]}</x${j}>\n`;
                shapeXML += `\t\t\t<y${j}>${object.cubic_bezier["y" + j]}</y${j}>\n`;
                shapeXML += `\t\t\t<x${j}_c1>${object.cubic_bezier["x" + j + "_c1"]}</x${j}_c1>\n`;
                shapeXML += `\t\t\t<y${j}_c1>${object.cubic_bezier["y" + j + "_c1"]}</y${j}_c1>\n`;
                shapeXML += `\t\t\t<x${j}_c2>${object.cubic_bezier["x" + j + "_c2"]}</x${j}_c2>\n`;
                shapeXML += `\t\t\t<y${j}_c2>${object.cubic_bezier["y" + j + "_c2"]}</y${j}_c2>\n`;
            }
            shapeXML += "\t\t</cubic_bezier>"
        } else if (object.cuboid) {
            shapeXML = "<cuboid>\n";
            let len = Object.keys(object.cuboid).length;
            for (let j = 1; j <= len / 2; j++) {
                shapeXML += `\t\t\t<x${j}>${object.cuboid["x" + j]}</x${j}>\n`;
                shapeXML += `\t\t\t<y${j}>${object.cuboid["y" + j]}</y${j}>\n`;
            }
            shapeXML += "\t\t</cuboid>"
        }
        objectXML +=
            `    <object>
    <name>${object.name}</name>
    <pose>Unspecified</pose>
    <truncated>0</truncated>
    <difficult>0</difficult>
    ${shapeXML}
</object>\n`
    }
    sizeXML = "";
    if (doc.size) {
        sizeXML = `<size>
    <width>${doc.size.width}</width>
    <height>${doc.size.height}</height>
    <depth>${doc.size.depth}</depth>
</size>
`
    }
    let dir_components = shenjian.path.parse(path_components.dir)
    let xml =
        `<?xml version="1.0" ?>
<annotation>
<folder>${dir_components.base}</folder>
<filename>${path_components.base}</filename>
<path>${doc.path}</path>
<source>
    <database>Unknown</database>
</source>
${sizeXML}
<segmented>0</segmented>
${objectXML}</annotation>
`
    return xml;
}
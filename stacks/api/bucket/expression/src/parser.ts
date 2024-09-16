import * as peg from "pegjs";
import * as fs from "fs";
import * as path from "path";

const grammarFilePath = path.join(__dirname, "grammar.pegjs");

const grammar = fs.readFileSync(grammarFilePath, {encoding: "utf8"}).toString();

const parser = peg.generate(grammar, {
  output: "parser"
});

export {parser};

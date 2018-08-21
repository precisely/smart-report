# heading1
<# comment should be ignored at beginning of text #> Text after an interpolation { x.y } heading1 
<div>Some more text<# comment should have no effect at end of text #></div><selfClosing/>
## Heading after selfClosing <# comment should be ignored after a heading #>
<MyComponent a=1 b="string" c={ x.y } d e=true f=false >
  Text inside <# comment should be ignored inside text #>MyComponent
  With escaped chars: {{ << }} >>
  <# comment should be ignored before a list #>
  * listElt1
  * listElt2
<SubComponent/><# comment should be ignored before end tag #></MyComponent>
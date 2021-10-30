<?php
$contents = file_get_contents( __DIR__ . '/template-contents.json' );
$contents = json_decode( $contents, true );

function create_markdown( $contents ) {
	$return = '';

	foreach ( $contents as $heading => $content ) {
		$pre_output        = ( isset( $content['output_raw'] ) && true === $content['output_raw'] || false !== strpos( $content['output'], '```' ) );
		$pre_usage         = ( isset( $content['usage_raw'] ) && true === $content['usage_raw'] || false !== strpos( $content['usage'], '```' ) );
		$content['output'] = ( $pre_output ) ? $content['output'] : '<pre>
' . $content['output'] . '
</pre>';
		$content['usage']  = ( $pre_usage ) ? $content['usage'] : '<pre>
' . $content['usage'] . '
</pre>';
		$return            .= <<<HTML
## $heading
{$content['description']}

### Usage :

{$content['usage']}

<details> 
<summary>Output :</summary>

{$content['output']}

</details>

---

HTML;
	}

	return $return;

}

foreach ( $contents as $_template ) {
	if ( isset( $_template['template'] ) && ! empty( $_template['template'] ) ) {
		$template = file_get_contents( __DIR__ . '/' . $_template['template'] );
		$template = str_replace( '{{ CONTENT }}', create_markdown( $_template['contents'] ), $template );
	} else {
		$template = create_markdown( $_template['contents'] );
	}
	file_put_contents( __DIR__ . '/' . $_template['output'], $template );
}


package org.shehersaaz.mohalla

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import java.io.File
import javax.xml.parsers.DocumentBuilderFactory

/**
 * RTL / localization foundation test.
 *
 * Verifies, on the JVM with no device required, that:
 *   1. every English string key has an Urdu counterpart
 *   2. no Urdu value is blank
 *   3. the manifest actually declares android:supportsRtl="true"
 *
 * Point 3 is the one most easily lost. Every `start`/`end` attribute in the
 * project silently degrades to `left`/`right` without it, producing an Urdu
 * layout that is wrong in a way that compiles and runs.
 */
class LocalizationParityTest {

    private fun readStrings(path: String): Map<String, String> {
        val file = File(path)
        assertTrue("missing resource file: $path", file.exists())
        val doc = DocumentBuilderFactory.newInstance().newDocumentBuilder().parse(file)
        val nodes = doc.getElementsByTagName("string")
        return buildMap {
            for (i in 0 until nodes.length) {
                val el = nodes.item(i)
                val name = el.attributes.getNamedItem("name").nodeValue
                put(name, el.textContent ?: "")
            }
        }
    }

    @Test
    fun `every english key has an urdu translation`() {
        val en = readStrings("src/main/res/values/strings.xml")
        val ur = readStrings("src/main/res/values-ur/strings.xml")

        val missing = en.keys - ur.keys
        assertTrue("missing Urdu translations for: $missing", missing.isEmpty())

        val orphan = ur.keys - en.keys
        assertTrue("Urdu keys with no English original: $orphan", orphan.isEmpty())

        assertEquals(en.size, ur.size)
    }

    @Test
    fun `no urdu value is blank`() {
        val ur = readStrings("src/main/res/values-ur/strings.xml")
        val blank = ur.filterValues { it.isBlank() }.keys
        assertTrue("blank Urdu values: $blank", blank.isEmpty())
    }

    @Test
    fun `manifest declares supportsRtl`() {
        val manifest = File("src/main/AndroidManifest.xml").readText()
        assertTrue(
            "AndroidManifest.xml must declare android:supportsRtl=\"true\" - " +
                "without it the Urdu layout does not mirror (LOCALE-FR-003, BR-041, REL-002)",
            manifest.contains("android:supportsRtl=\"true\""),
        )
    }
}

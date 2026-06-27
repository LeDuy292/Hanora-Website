using JiebaNet.Segmenter;

namespace Services;

public interface IChineseSegmenterService
{
    List<string> SegmentPreservingStructure(string text);
}

public class ChineseSegmenterService : IChineseSegmenterService
{
    private readonly JiebaSegmenter _segmenter = new();

    public List<string> SegmentPreservingStructure(string text)
    {
        var result = new List<string>();
        if (string.IsNullOrWhiteSpace(text)) return result;

        text = text.Replace("\r\n", "\n").Replace('\r', '\n');
        var paragraphs = text.Split("\n\n", StringSplitOptions.None);

        for (var p = 0; p < paragraphs.Length; p++)
        {
            if (p > 0) result.Add("\n\n");

            var lines = paragraphs[p].Split('\n');
            for (var l = 0; l < lines.Length; l++)
            {
                if (l > 0) result.Add("\n");

                var trimmed = lines[l].Trim();
                if (string.IsNullOrEmpty(trimmed)) continue;

                result.AddRange(_segmenter.Cut(trimmed));
            }
        }

        return result;
    }
}

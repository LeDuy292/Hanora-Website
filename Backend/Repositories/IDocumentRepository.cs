using BusinessObjects.Models;

namespace Repositories;

public interface IDocumentRepository
{
    Task<Document> CreateAsync(Document document);
    Task<Document?> GetByIdAsync(long id);
    Task<Document> UpdateAsync(Document document);
    Task<IEnumerable<Document>> GetByUserIdAsync(long userId);
}
